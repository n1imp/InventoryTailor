import express, { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import pino from "pino";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Parser } from "json2csv";
import Stripe from "stripe";
import * as Sentry from "@sentry/node";
import rateLimit from "express-rate-limit";
import { v4 as uuidv4 } from "uuid";
import { sendVerificationEmail, sendPasswordResetEmail, sendInvitationEmail, sendEmail } from "./services/email";
import { getStripe, STRIPE_PLANS, PLAN_LIMITS } from "./services/stripe";
import "express-async-errors";

dotenv.config({ override: true });

// Initialize Sentry
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: 1.0,
  });
}

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: { colorize: true },
  },
});

const prisma = new PrismaClient();
const JWT_SECRET = process.env.GEMINI_API_KEY || "super-secret-key";
const PORT = 3000;

// Swagger Configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "InventoryTailor API",
      version: "1.0.0",
      description: "Surgical Inventory Management API Documentation",
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./server.ts"], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);

  // Stripe Webhook - MUST be before express.json() to use express.raw()
  app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    const stripe = getStripe();
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET || ""
      );
    } catch (err: any) {
      logger.error(err, "Webhook signature verification failed");
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const companyId = parseInt(session.metadata?.companyId || "0");
          if (companyId) {
            await prisma.company.update({
              where: { id: companyId },
              data: {
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: session.subscription as string,
                subscriptionStatus: "active",
              },
            });
          }
          break;
        }
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          const subscription = event.data.object as any;
          const company = await prisma.company.findFirst({
            where: { stripeSubscriptionId: subscription.id },
          });
          if (company) {
            const plan = (subscription.items.data[0].plan.metadata?.plan as string) || company.plan;
            await (prisma.company as any).update({
              where: { id: company.id },
              data: {
                subscriptionStatus: subscription.status,
                plan: plan,
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              },
            });
          }
          break;
        }
        case "invoice.paid": {
          const invoice = event.data.object as any;
          const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const company = await prisma.company.findFirst({
              where: { stripeSubscriptionId: subscription.id },
            });
            if (company) {
              await (prisma.company as any).update({
                where: { id: company.id },
                data: {
                  subscriptionStatus: "active",
                  currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
                },
              });
            }
          }
          break;
        }
        case "invoice.payment_failed": {
          const invoice = event.data.object as any;
          const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
          if (subscriptionId) {
            const company = await prisma.company.findFirst({
              where: { stripeSubscriptionId: subscriptionId },
            });
            if (company) {
              await prisma.company.update({
                where: { id: company.id },
                data: { subscriptionStatus: "past_due" },
              });
            }
          }
          break;
        }
      }
    } catch (err) {
      logger.error(err, "Error processing webhook event");
      return res.status(500).send("Internal Server Error");
    }

    res.json({ received: true });
  });

  app.use(express.json());

  // Logging Middleware
  app.use((req, res, next) => {
    logger.info({ method: req.method, url: req.url }, "Incoming Request");
    next();
  });

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Auth Middleware
  const authenticate = (req: any, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  const checkRole = (roles: string[]) => (req: any, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
    }
    next();
  };

  const checkSubscription = async (req: any, res: Response, next: NextFunction) => {
    const company = await prisma.company.findUnique({
      where: { id: req.user.companyId },
    });

    if (!company) return res.status(404).json({ error: "Company not found" });

    const now = new Date();
    const isTrialActive = company.trialEndsAt && company.trialEndsAt > now;
    const isSubscriptionActive = ['active', 'trialing'].includes(company.subscriptionStatus);

    if (!isTrialActive && !isSubscriptionActive) {
      return res.status(403).json({ 
        error: "Subscription required", 
        code: "SUBSCRIPTION_REQUIRED",
        trialExpired: !isTrialActive && company.plan === 'trial',
        status: company.subscriptionStatus
      });
    }

    req.company = company;
    next();
  };

  const checkLimits = (resource: 'products' | 'users') => async (req: any, res: Response, next: NextFunction) => {
    const company = req.company || await prisma.company.findUnique({ where: { id: req.user.companyId } });
    const limits = PLAN_LIMITS[company.plan] || PLAN_LIMITS.trial;

    if (resource === 'products') {
      const count = await prisma.product.count({ where: { companyId: company.id } });
      if (count >= limits.products) {
        return res.status(403).json({ 
          error: `Product limit reached for ${company.plan} plan (${limits.products}). Please upgrade.`,
          code: "LIMIT_REACHED"
        });
      }
    }

    if (resource === 'users') {
      const count = await prisma.user.count({ where: { companyId: company.id } });
      if (count >= limits.users) {
        return res.status(403).json({ 
          error: `User limit reached for ${company.plan} plan (${limits.users}). Please upgrade.`,
          code: "LIMIT_REACHED"
        });
      }
    }

    next();
  };

  const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: { error: "Too many requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
  });

  const createAuditLog = async (data: {
    companyId: number;
    userId: number;
    action: string;
    entityType: string;
    entityId?: number;
    details?: any;
  }) => {
    try {
      await prisma.auditLog.create({
        data: {
          ...data,
          details: data.details ? JSON.stringify(data.details) : null,
        },
      });
    } catch (err) {
      logger.error(err, "Failed to create audit log");
    }
  };

  /**
   * @openapi
   * /api/auth/register:
   *   post:
   *     summary: Register a new company and admin user
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               companyName: { type: string }
   *               email: { type: string }
   *               password: { type: string }
   */
  app.post("/api/auth/register", authRateLimiter, async (req, res) => {
    const { companyName, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "An account with this email already exists." });
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14-day trial

    const verificationToken = uuidv4();

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { 
          name: companyName,
          plan: 'trial',
          trialEndsAt,
        },
      });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await tx.user.create({
        data: {
          companyId: company.id,
          email,
          password: hashedPassword,
          role: 'admin',
          verificationToken,
        },
      });

      await createAuditLog({
        companyId: company.id,
        userId: user.id,
        action: 'REGISTER_COMPANY',
        entityType: 'COMPANY',
        entityId: company.id,
        details: { companyName, email },
      });

      return { companyId: company.id, userId: user.id, verificationToken };
    });

    // Send verification email
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    try {
      await sendVerificationEmail(email, result.verificationToken, appUrl);
    } catch (emailError: any) {
      logger.error({ email, error: emailError.message }, "Failed to send verification email during registration");
      // If it's a validation error from Resend, we still want to inform the user but maybe they can still log in if we bypass verification for dev?
      // For now, just log it and proceed, but warn the user.
      return res.json({ 
        success: true, 
        message: "Registration successful, but we couldn't send the verification email. Please contact support if you cannot log in.",
        warning: "EMAIL_SEND_FAILED"
      });
    }

    logger.info({ companyId: result.companyId, userId: result.userId }, "New company and admin registered. Verification email sent.");
    res.json({ success: true, message: "Registration successful. Please check your email to verify your account." });
  });

  app.post("/api/auth/verify-email", async (req, res) => {
    const { token } = req.body;
    const user = await prisma.user.findFirst({ where: { verificationToken: token } });

    if (!user) return res.status(400).json({ error: "Invalid or expired verification token" });

    await prisma.user.update({
      where: { id: user.id },
      data: { 
        emailVerifiedAt: new Date(),
        verificationToken: null 
      }
    });

    res.json({ success: true, message: "Email verified successfully" });
  });

  app.post("/api/auth/forgot-password", authRateLimiter, async (req, res) => {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = uuidv4();
      const expires = new Date();
      expires.setHours(expires.getHours() + 1); // 1 hour expiry

      await prisma.user.update({
        where: { id: user.id },
        data: { 
          resetPasswordToken: token,
          resetPasswordExpiresAt: expires
        }
      });

      const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
      try {
        await sendPasswordResetEmail(email, token, appUrl);
      } catch (emailError: any) {
        logger.error({ email, error: emailError.message }, "Failed to send password reset email");
      }
    }

    // Always return success to prevent email enumeration
    res.json({ success: true, message: "If an account exists with that email, a reset link has been sent." });
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { token, password } = req.body;
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpiresAt: { gte: new Date() }
      }
    });

    if (!user) return res.status(400).json({ error: "Invalid or expired reset token" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpiresAt: null
      }
    });

    res.json({ success: true, message: "Password reset successfully" });
  });

  /**
   * @openapi
   * /api/auth/login:
   *   post:
   *     summary: Login to get a JWT token
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               email: { type: string }
   *               password: { type: string }
   */
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.emailVerifiedAt) {
      return res.status(403).json({ 
        error: "Please verify your email before logging in.",
        code: "EMAIL_NOT_VERIFIED"
      });
    }

    const token = jwt.sign(
      { id: user.id, companyId: user.companyId, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    logger.info({ userId: user.id, companyId: user.companyId }, "User logged in");
    res.json({ 
      token, 
      user: { id: user.id, email: user.email, companyId: user.companyId } 
    });
  });

  /**
   * @openapi
   * /api/products:
   *   get:
   *     summary: List all products for the company with filters and pagination
   *     tags: [Products]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: query
   *         name: search
   *         schema: { type: string }
   *       - in: query
   *         name: category
   *         schema: { type: string }
   *       - in: query
   *         name: brand
   *         schema: { type: string }
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 20 }
   */
  app.get("/api/products", authenticate, checkSubscription, async (req: any, res) => {
    const { search, category, brand, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: any = {
      companyId: req.user.companyId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { brand: { contains: search } },
        { variations: { some: { sku: { contains: search } } } }
      ];
    }

    if (category) where.category = category;
    if (brand) where.brand = brand;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          variations: true,
          images: true,
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      data: products,
      pagination: {
        total,
        page: parseInt(page),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    });
  });

  /**
   * @openapi
   * /api/products:
   *   post:
   *     summary: Create a new product
   *     tags: [Products]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name: { type: string }
   *               category: { type: string }
   *               brand: { type: string }
   *               description: { type: string }
   */
  app.post("/api/products", authenticate, checkSubscription, checkRole(['admin', 'manager']), checkLimits('products'), async (req: any, res) => {
    const { name, category, brand, description } = req.body;
    
    if (!name || !category) {
      return res.status(400).json({ error: "Name and category are required" });
    }

    const product = await prisma.product.create({
      data: {
        companyId: req.user.companyId,
        name,
        description: description || "",
        brand: brand || "",
        category,
      },
    });

    // Update onboarding flag
    await prisma.company.update({
      where: { id: req.user.companyId },
      data: { hasCreatedProduct: true }
    });

    await createAuditLog({
      companyId: req.user.companyId,
      userId: req.user.id,
      action: 'CREATE_PRODUCT',
      entityType: 'PRODUCT',
      entityId: product.id,
      details: { name, category },
    });

    logger.info({ productId: product.id, companyId: req.user.companyId }, "Product created");
    res.json({ id: product.id });
  });

  app.patch("/api/products/:id", authenticate, checkSubscription, checkRole(['admin', 'manager']), async (req: any, res) => {
    const { name, category, brand, description } = req.body;
    const productId = parseInt(req.params.id);

    const product = await prisma.product.update({
      where: { id: productId, companyId: req.user.companyId },
      data: { name, category, brand, description }
    });

    await createAuditLog({
      companyId: req.user.companyId,
      userId: req.user.id,
      action: 'UPDATE_PRODUCT',
      entityType: 'PRODUCT',
      entityId: product.id,
      details: { name, category },
    });

    res.json(product);
  });

  app.delete("/api/products/:id", authenticate, checkSubscription, checkRole(['admin']), async (req: any, res) => {
    const productId = parseInt(req.params.id);

    // Check if product has variations with stock
    const variations = await prisma.variation.findMany({
      where: { productId, companyId: req.user.companyId }
    });

    const hasStock = variations.some(v => v.stockCurrent > 0);
    if (hasStock) {
      return res.status(400).json({ error: "Cannot delete product with active stock. Please adjust stock to zero first." });
    }

    await prisma.$transaction(async (tx) => {
      // Delete variations first (Prisma will handle this if onDelete: Cascade is set, but let's be safe)
      await tx.variation.deleteMany({ where: { productId, companyId: req.user.companyId } });
      await tx.product.delete({ where: { id: productId, companyId: req.user.companyId } });
    });

    await createAuditLog({
      companyId: req.user.companyId,
      userId: req.user.id,
      action: 'DELETE_PRODUCT',
      entityType: 'PRODUCT',
      entityId: productId,
    });

    res.json({ success: true });
  });

  /**
   * @openapi
   * /api/products/{productId}/variations:
   *   get:
   *     summary: List variations for a product
   *     tags: [Variations]
   *     parameters:
   *       - in: path
   *         name: productId
   *         required: true
   *         schema: { type: integer }
   */
  app.get("/api/products/:productId/variations", authenticate, async (req: any, res) => {
    const variations = await prisma.variation.findMany({
      where: { 
        productId: parseInt(req.params.productId),
        companyId: req.user.companyId 
      },
    });
    res.json(variations);
  });

  /**
   * @openapi
   * /api/variations:
   *   post:
   *     summary: Create a new variation
   *     tags: [Variations]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               productId: { type: integer }
   *               sku: { type: string }
   *               price: { type: number }
   *               cost: { type: number }
   *               initialStock: { type: integer }
   */
  app.post("/api/variations", authenticate, checkSubscription, checkRole(['admin', 'manager']), async (req: any, res) => {
    const { productId, sku, size, color, price, cost, stockMin, initialStock } = req.body;
    
    if (!productId || !sku || price === undefined || cost === undefined) {
      return res.status(400).json({ error: "Product ID, SKU, price, and cost are required" });
    }

    try {
      const variation = await prisma.$transaction(async (tx) => {
        const v = await tx.variation.create({
          data: {
            productId: parseInt(productId),
            companyId: req.user.companyId,
            sku,
            size: size || "",
            color: color || "",
            price: parseFloat(price),
            cost: parseFloat(cost),
            stockMin: parseInt(stockMin || 0),
            stockCurrent: parseInt(initialStock || 0),
          },
        });

        if (initialStock && initialStock > 0) {
          await tx.movement.create({
            data: {
              companyId: req.user.companyId,
              variationId: v.id,
              type: 'in',
              quantity: parseInt(initialStock),
              performedBy: req.user.id,
            },
          });
        }

        await createAuditLog({
          companyId: req.user.companyId,
          userId: req.user.id,
          action: 'CREATE_VARIATION',
          entityType: 'VARIATION',
          entityId: v.id,
          details: { sku, price, cost, initialStock },
        });

        return v;
      });

      logger.info({ variationId: variation.id, companyId: req.user.companyId }, "Variation created");
      res.json({ id: variation.id });
    } catch (err: any) {
      if (err.code === 'P2002') {
        return res.status(400).json({ error: "SKU already exists for this company" });
      }
      throw err;
    }
  });

  app.patch("/api/variations/:id", authenticate, checkSubscription, checkRole(['admin', 'manager']), async (req: any, res) => {
    const { sku, size, color, price, cost, stockMin } = req.body;
    const variationId = parseInt(req.params.id);

    try {
      const variation = await prisma.variation.update({
        where: { id: variationId, companyId: req.user.companyId },
        data: { 
          sku, 
          size, 
          color, 
          price: price !== undefined ? parseFloat(price) : undefined, 
          cost: cost !== undefined ? parseFloat(cost) : undefined, 
          stockMin: stockMin !== undefined ? parseInt(stockMin) : undefined 
        }
      });

      await createAuditLog({
        companyId: req.user.companyId,
        userId: req.user.id,
        action: 'UPDATE_VARIATION',
        entityType: 'VARIATION',
        entityId: variation.id,
        details: { sku, size, color },
      });

      res.json(variation);
    } catch (err: any) {
      if (err.code === 'P2002') {
        return res.status(400).json({ error: "SKU already exists for this company" });
      }
      throw err;
    }
  });

  app.delete("/api/variations/:id", authenticate, checkSubscription, checkRole(['admin']), async (req: any, res) => {
    const variationId = parseInt(req.params.id);

    const variation = await prisma.variation.findFirst({
      where: { id: variationId, companyId: req.user.companyId }
    });

    if (!variation) return res.status(404).json({ error: "Variation not found" });
    if (variation.stockCurrent > 0) {
      return res.status(400).json({ error: "Cannot delete variation with active stock." });
    }

    await prisma.variation.delete({
      where: { id: variationId, companyId: req.user.companyId }
    });

    await createAuditLog({
      companyId: req.user.companyId,
      userId: req.user.id,
      action: 'DELETE_VARIATION',
      entityType: 'VARIATION',
      entityId: variationId,
    });

    res.json({ success: true });
  });

  /**
   * @openapi
   * /api/movements:
   *   post:
   *     summary: Record a stock movement
   *     tags: [Movements]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               variationId: { type: integer }
   *               type: { type: string, enum: [in, out, sale, purchase, loss] }
   *               quantity: { type: integer }
   */
  app.post("/api/movements", authenticate, checkSubscription, async (req: any, res) => {
    const { variationId, type, quantity } = req.body;
    
    await prisma.$transaction(async (tx) => {
      const variation = await tx.variation.findFirst({
        where: { id: parseInt(variationId), companyId: req.user.companyId }
      });

      if (!variation) throw new Error("Variation not found");

      const isIncoming = ['in', 'purchase', 'return'].includes(type);
      const newStock = isIncoming 
        ? variation.stockCurrent + quantity 
        : variation.stockCurrent - quantity;

      await tx.variation.update({
        where: { id: variation.id },
        data: { stockCurrent: newStock }
      });

      await tx.movement.create({
        data: {
          companyId: req.user.companyId,
          variationId: variation.id,
          type,
          quantity,
          performedBy: req.user.id,
        },
      });

      // Update onboarding flag
      await tx.company.update({
        where: { id: req.user.companyId },
        data: { hasAddedStock: true }
      });

      await createAuditLog({
        companyId: req.user.companyId,
        userId: req.user.id,
        action: 'STOCK_MOVEMENT',
        entityType: 'VARIATION',
        entityId: variation.id,
        details: { type, quantity, newStock },
      });
    });

    logger.info({ variationId, type, quantity, companyId: req.user.companyId }, "Stock movement recorded");
    res.json({ success: true });
  });

  /**
   * @openapi
   * /api/dashboard/summary:
   *   get:
   *     summary: Get dashboard summary statistics
   *     tags: [Dashboard]
   */
  app.get("/api/dashboard/summary", authenticate, checkSubscription, async (req: any, res) => {
    const [totalSkus, variations, lowStockCount] = await Promise.all([
      prisma.variation.count({ where: { companyId: req.user.companyId } }),
      prisma.variation.findMany({ where: { companyId: req.user.companyId } }),
      prisma.variation.count({ 
        where: { 
          companyId: req.user.companyId,
          stockCurrent: { lte: prisma.variation.fields.stockMin }
        } 
      })
    ]);

    const stockValue = variations.reduce((acc, v) => acc + (v.stockCurrent * v.price), 0);
    
    res.json({
      totalSkus,
      stockValue,
      lowStockCount
    });
  });

  /**
   * @openapi
   * /api/dashboard/low-stock:
   *   get:
   *     summary: Get items with low stock
   *     tags: [Dashboard]
   */
  app.get("/api/dashboard/low-stock", authenticate, checkSubscription, async (req: any, res) => {
    // In Prisma, we can't easily compare two columns in a where clause without raw SQL or computed fields
    // For simplicity in this demo, we'll fetch and filter, or use raw SQL
    const items: any = await prisma.$queryRaw`
      SELECT v.*, p.name as product_name 
      FROM variations v 
      JOIN products p ON v.product_id = p.id 
      WHERE v.company_id = ${req.user.companyId} AND v.stock_current <= v.stock_min
      LIMIT 10
    `;
    
    // Map snake_case to camelCase for the frontend
    const mappedItems = items.map((item: any) => ({
      ...item,
      stockCurrent: item.stock_current,
      stockMin: item.stock_min,
      productId: item.product_id,
      companyId: item.company_id
    }));

    res.json(mappedItems);
  });

  /**
   * @openapi
   * /api/dashboard/movements:
   *   get:
   *     summary: Get stock movements for chart
   *     tags: [Dashboard]
   */
  app.get("/api/dashboard/movements", authenticate, checkSubscription, async (req: any, res) => {
    const companyId = req.user.companyId;
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const movements = await prisma.movement.findMany({
      where: {
        companyId,
        createdAt: { gte: last7Days }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group by date
    const grouped = movements.reduce((acc: any, m) => {
      const date = m.createdAt.toISOString().split('T')[0];
      if (!acc[date]) acc[date] = { date, incoming: 0, outgoing: 0 };
      
      const isIncoming = ['in', 'purchase', 'return'].includes(m.type);
      if (isIncoming) acc[date].incoming += m.quantity;
      else acc[date].outgoing += m.quantity;
      
      return acc;
    }, {});

    res.json(Object.values(grouped));
  });

  /**
   * @openapi
   * /api/dashboard/analytics:
   *   get:
   *     summary: Get advanced dashboard analytics
   *     tags: [Dashboard]
   */
  app.get("/api/dashboard/analytics", authenticate, checkSubscription, async (req: any, res) => {
    const companyId = req.user.companyId;

    const [topMoving, stockBySize, movements] = await Promise.all([
      // Top moving SKUs (by total quantity in movements)
      prisma.movement.groupBy({
        by: ['variationId'],
        where: { companyId, type: { in: ['sale', 'out'] } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
      // Stock distribution by size
      prisma.variation.groupBy({
        by: ['size'],
        where: { companyId },
        _sum: { stockCurrent: true },
      }),
      // Movements for turnover calculation (last 30 days)
      prisma.movement.findMany({
        where: { 
          companyId, 
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          type: { in: ['sale', 'out'] }
        },
      })
    ]);

    // Enrich top moving with SKU details
    const topMovingEnriched = await Promise.all(
      topMoving.map(async (item) => {
        const variation = await prisma.variation.findUnique({
          where: { id: item.variationId },
          select: { sku: true },
        });
        return { sku: variation?.sku, quantity: item._sum.quantity };
      })
    );

    res.json({
      topMoving: topMovingEnriched,
      stockBySize: stockBySize.map(s => ({ size: s.size || 'N/A', count: s._sum.stockCurrent })),
      turnover: movements.length, // Simple metric for now
    });
  });

  /**
   * @openapi
   * /api/products/{productId}/images:
   *   post:
   *     summary: Add an image to a product
   *     tags: [Products]
   */
  app.post("/api/products/:productId/images", authenticate, async (req: any, res) => {
    const { url, isMain } = req.body;
    const productId = parseInt(req.params.productId);

    const image = await prisma.productImage.create({
      data: {
        productId,
        url,
        isMain: isMain || false,
      },
    });

    if (isMain) {
      // Ensure only one main image
      await prisma.productImage.updateMany({
        where: { productId, id: { not: image.id } },
        data: { isMain: false },
      });
    }

    res.json(image);
  });

  /**
   * @openapi
   * /api/company/users:
   *   get:
   *     summary: List all users in the company
   *     tags: [Company]
   *     security: [{ bearerAuth: [] }]
   */
  app.get("/api/company/users", authenticate, checkRole(['admin']), async (req: any, res) => {
    const users = await prisma.user.findMany({
      where: { companyId: req.user.companyId },
      select: { id: true, email: true, role: true, createdAt: true },
    });
    res.json(users);
  });

  /**
   * @openapi
   * /api/company/users/{userId}:
   *   patch:
   *     summary: Update a user's role
   *     tags: [Company]
   *     security: [{ bearerAuth: [] }]
   */
  app.patch("/api/company/users/:userId", authenticate, checkRole(['admin']), async (req: any, res) => {
    const { role } = req.body;
    const userId = parseInt(req.params.userId);

    if (userId === req.user.id) {
      return res.status(400).json({ error: "Cannot change your own role" });
    }

    const user = await prisma.user.update({
      where: { id: userId, companyId: req.user.companyId },
      data: { role },
    });

    await createAuditLog({
      companyId: req.user.companyId,
      userId: req.user.id,
      action: 'UPDATE_USER_ROLE',
      entityType: 'USER',
      entityId: user.id,
      details: { newRole: role },
    });

    res.json({ success: true });
  });

  /**
   * @openapi
   * /api/company/invitations:
   *   post:
   *     summary: Create a user invitation
   *     tags: [Company]
   *     security: [{ bearerAuth: [] }]
   */
  app.post("/api/company/invitations", authenticate, checkRole(['admin', 'manager']), checkLimits('users'), async (req: any, res) => {
    const { email, role } = req.body;
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const company = await prisma.company.findUnique({ where: { id: req.user.companyId } });

    const invitation = await prisma.invitation.create({
      data: {
        companyId: req.user.companyId,
        email,
        role: role || 'staff',
        token,
        invitedBy: req.user.id,
        expiresAt,
      },
    });

    // Update onboarding flag
    await prisma.company.update({
      where: { id: req.user.companyId },
      data: { hasInvitedMember: true }
    });

    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    try {
      await sendInvitationEmail(email, token, company?.name || 'Inventory Pro', appUrl);
    } catch (emailError: any) {
      logger.error({ email, error: emailError.message }, "Failed to send invitation email");
      return res.json({ 
        success: true, 
        message: "Invitation created, but we couldn't send the email. You can share the invitation token manually.",
        token,
        warning: "EMAIL_SEND_FAILED"
      });
    }
    
    logger.info({ invitationId: invitation.id, token }, "Invitation created and email sent.");
    
    res.json({ success: true, token });
  });

  // --- Company API ---
  app.get("/api/company/details", authenticate, async (req: any, res) => {
    const company = await prisma.company.findUnique({
      where: { id: req.user.companyId },
      include: {
        _count: {
          select: {
            users: true,
            products: true,
          }
        }
      }
    });
    res.json(company);
  });

  /**
   * @openapi
   * /api/billing/create-checkout-session:
   *   post:
   *     summary: Create a Stripe Checkout session for subscription
   *     tags: [Billing]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               plan: { type: string }
   */
  app.post("/api/billing/create-checkout-session", authenticate, async (req: any, res) => {
    const { plan } = req.body;
    const stripe = getStripe();
    const company = await prisma.company.findUnique({ where: { id: req.user.companyId } });
    if (!company) return res.status(404).json({ error: "Company not found" });

    const priceId = STRIPE_PLANS[plan as keyof typeof STRIPE_PLANS];
    if (!priceId) return res.status(400).json({ error: "Invalid plan" });

    const session = await stripe.checkout.sessions.create({
      customer: company.stripeCustomerId || undefined,
      customer_email: company.stripeCustomerId ? undefined : req.user.email,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.APP_URL || 'http://localhost:3000'}/?view=billing&success=true`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/?view=billing&canceled=true`,
      metadata: {
        companyId: company.id.toString(),
      },
      subscription_data: {
        metadata: {
          companyId: company.id.toString(),
        },
      },
    });

    res.json({ url: session.url });
  });

  /**
   * @openapi
   * /api/billing/create-portal-session:
   *   post:
   *     summary: Create a Stripe Customer Portal session
   *     tags: [Billing]
   */
  app.post("/api/billing/create-portal-session", authenticate, async (req: any, res) => {
    const stripe = getStripe();
    const company = await prisma.company.findUnique({ where: { id: req.user.companyId } });
    if (!company || !company.stripeCustomerId) {
      return res.status(400).json({ error: "No active subscription found" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: company.stripeCustomerId,
      return_url: `${process.env.APP_URL || 'http://localhost:3000'}/?view=billing`,
    });

    res.json({ url: session.url });
  });

  // --- Notifications API ---
  app.get("/api/notifications", authenticate, async (req: any, res) => {
    const notifications = await prisma.notification.findMany({
      where: { 
        companyId: req.user.companyId,
        OR: [
          { userId: null },
          { userId: req.user.id }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json(notifications);
  });

  app.patch("/api/notifications/:id/read", authenticate, async (req: any, res) => {
    await prisma.notification.update({
      where: { id: parseInt(req.params.id), companyId: req.user.companyId },
      data: { readAt: new Date() }
    });
    res.json({ success: true });
  });

  // --- Onboarding API ---
  app.get("/api/company/onboarding", authenticate, async (req: any, res) => {
    const company = await prisma.company.findUnique({
      where: { id: req.user.companyId },
      select: {
        onboardingCompleted: true,
        hasCreatedProduct: true,
        hasAddedStock: true,
        hasInvitedMember: true
      }
    });
    res.json(company);
  });

  app.patch("/api/company/onboarding/complete", authenticate, async (req: any, res) => {
    await prisma.company.update({
      where: { id: req.user.companyId },
      data: { onboardingCompleted: true }
    });
    res.json({ success: true });
  });

  // --- Support API ---
  app.post("/api/support/feedback", authenticate, async (req: any, res) => {
    const { message, type } = req.body;
    // In a real app, send to a support email or Slack
    logger.info({ userId: req.user.id, companyId: req.user.companyId, message, type }, "User feedback received");
    
    await sendEmail({
      to: 'support@inventorytailor.com',
      subject: `New Feedback: ${type}`,
      html: `
        <p><strong>From:</strong> ${req.user.email}</p>
        <p><strong>Type:</strong> ${type}</p>
        <p><strong>Message:</strong> ${message}</p>
      `
    });

    res.json({ success: true });
  });

  // --- Admin Insights API ---
  app.get("/api/admin/insights", authenticate, async (req: any, res) => {
    // Simple check for platform admin (e.g., specific email domain or superuser flag)
    const userEmail = req.user?.email || '';
    if (!userEmail.endsWith('@inventorytailor.com') && userEmail !== 'goln1iago@gmail.com') {
      return res.status(403).json({ error: "Forbidden: Platform Admin only" });
    }

    const [totalCompanies, activeTrials, paidSubscriptions, totalUsers, totalProducts] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { plan: 'trial', subscriptionStatus: 'active' } }),
      prisma.company.count({ where: { plan: { not: 'trial' }, subscriptionStatus: 'active' } }),
      prisma.user.count(),
      prisma.product.count()
    ]);

    const recentCompanies = await prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { _count: { select: { users: true, products: true } } }
    });

    res.json({
      stats: {
        totalCompanies,
        activeTrials,
        paidSubscriptions,
        totalUsers,
        totalProducts
      },
      recentCompanies
    });
  });

  /**
   * @openapi
   * /api/auth/accept-invitation:
   *   post:
   *     summary: Accept an invitation and create a user
   *     tags: [Auth]
   */
  app.post("/api/auth/accept-invitation", async (req, res) => {
    const { token, password } = req.body;

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { company: true },
    });

    if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
      return res.status(400).json({ error: "Invalid or expired invitation" });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email: invitation.email } });
    if (existingUser) {
      return res.status(400).json({ error: "A user with this email already exists. Please log in instead." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: invitation.email,
          password: hashedPassword,
          role: invitation.role,
          companyId: invitation.companyId,
          emailVerifiedAt: new Date(), // Invitations verify the email implicitly
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      await createAuditLog({
        companyId: newUser.companyId,
        userId: newUser.id,
        action: 'ACCEPT_INVITATION',
        entityType: 'USER',
        entityId: newUser.id,
        details: { email: newUser.email, role: newUser.role },
      });

      return newUser;
    });

    res.json({ success: true, userId: user.id });
  });

  /**
   * @openapi
   * /api/audit-logs:
   *   get:
   *     summary: Get audit logs for the company
   *     tags: [Audit Logs]
   *     security: [{ bearerAuth: [] }]
   */
  app.get("/api/audit-logs", authenticate, checkRole(['admin', 'manager']), async (req: any, res) => {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { companyId: req.user.companyId },
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.auditLog.count({ where: { companyId: req.user.companyId } })
    ]);

    res.json({
      data: logs,
      total,
      totalPages: Math.ceil(total / take),
      page: parseInt(page)
    });
  });

  app.delete("/api/company/users/:userId", authenticate, checkRole(['admin']), async (req: any, res) => {
    const userId = parseInt(req.params.userId);

    if (userId === req.user.id) {
      return res.status(400).json({ error: "Cannot delete yourself" });
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, companyId: req.user.companyId }
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    await prisma.user.delete({
      where: { id: userId, companyId: req.user.companyId }
    });

    await createAuditLog({
      companyId: req.user.companyId,
      userId: req.user.id,
      action: 'DELETE_USER',
      entityType: 'USER',
      entityId: userId,
      details: { email: user.email },
    });

    res.json({ success: true });
  });

  /**
   * @openapi
   * /api/dashboard/activity:
   *   get:
   *     summary: Get recent activity feed
   *     tags: [Dashboard]
   */
  app.get("/api/dashboard/activity", authenticate, checkSubscription, async (req: any, res) => {
    const logs = await prisma.auditLog.findMany({
      where: { companyId: req.user.companyId },
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    res.json(logs);
  });

  /**
   * @openapi
   * /api/exports/inventory:
   *   get:
   *     summary: Export inventory to CSV
   *     tags: [Exports]
   */
  app.get("/api/exports/inventory", authenticate, checkSubscription, async (req: any, res) => {
    const variations = await prisma.variation.findMany({
      where: { companyId: req.user.companyId },
      include: { product: true },
    });

    const data = variations.map(v => ({
      Product: v.product.name,
      SKU: v.sku,
      Size: v.size,
      Color: v.color,
      Price: v.price,
      Stock: v.stockCurrent,
      MinStock: v.stockMin,
    }));

    const parser = new Parser();
    const csv = parser.parse(data);

    res.header('Content-Type', 'text/csv');
    res.attachment('inventory.csv');
    res.send(csv);
  });

  /**
   * @openapi
   * /api/billing/checkout:
   *   post:
   *     summary: Create a Stripe checkout session
   *     tags: [Billing]
   */
  app.post("/api/billing/checkout", authenticate, async (req: any, res) => {
    const { plan } = req.body; // starter, pro, business
    const company = await prisma.company.findUnique({ where: { id: req.user.companyId } });
    
    if (!company) return res.status(404).json({ error: "Company not found" });

    // In a real app, you'd use actual Stripe price IDs
    const priceMap: any = {
      starter: 'price_starter_mock',
      pro: 'price_pro_mock',
      business: 'price_business_mock',
    };

    try {
      // Mocking Stripe session creation
      // const session = await getStripe().checkout.sessions.create({ ... });
      
      // For demo, we'll just simulate success and update the plan directly if requested
      // In production, this would happen via Webhook
      await prisma.company.update({
        where: { id: company.id },
        data: { 
          plan,
          subscriptionStatus: 'active',
          trialEndsAt: null 
        }
      });

      res.json({ url: '/dashboard?billing=success' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Error Handling Middleware
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error(err);
    const status = err.status || 500;
    res.status(status).json({
      error: err.message || "Internal Server Error",
      status
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.post("/api/admin/tasks/trial-reminders", async (req, res) => {
    const secret = req.headers['x-task-secret'];
    if (secret !== process.env.TASK_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    const expiringTrials = await prisma.company.findMany({
      where: {
        plan: 'trial',
        trialEndsAt: {
          gte: new Date(),
          lte: threeDaysFromNow
        }
      },
      include: { users: { where: { role: 'admin' } } }
    });

    for (const company of expiringTrials) {
      for (const admin of company.users) {
        await sendEmail({
          to: admin.email,
          subject: 'Your Inventory Pro trial is expiring soon!',
          html: `
            <h1>Trial Expiring Soon</h1>
            <p>Your 14-day free trial for ${company.name} will expire on ${company.trialEndsAt?.toLocaleDateString()}.</p>
            <p>To keep using Inventory Pro without interruption, please upgrade to a paid plan.</p>
            <a href="${process.env.APP_URL}/billing">Upgrade Now</a>
          `
        });
      }
    }

    res.json({ success: true, count: expiringTrials.length });
  });

  // Global Error Handler for Sentry
  if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
  }

  app.listen(PORT, "0.0.0.0", () => {
    logger.info(`Server running on http://localhost:${PORT}`);
    logger.info(`API Documentation available at http://localhost:${PORT}/api/docs`);
  });
}

startServer().catch((err) => {
  logger.fatal(err, "Failed to start server");
  process.exit(1);
});
