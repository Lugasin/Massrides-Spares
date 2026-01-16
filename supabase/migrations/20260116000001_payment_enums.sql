-- Migration: Payment System Enums
-- Purpose: Create enums for order processing, payments, refunds, and auditing.

-- 1. order_status
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM (
        'draft', 
        'awaiting_payment', 
        'paid', 
        'processing',
        'shipped', 
        'delivered', 
        'cancelled', 
        'refunded'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. payment_status
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM (
        'pending', 
        'processing', 
        'success', 
        'failed',
        'reversed', 
        'refunded', 
        'expired'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. refund_status
DO $$ BEGIN
    CREATE TYPE refund_status AS ENUM (
        'pending', 
        'approved', 
        'processing', 
        'completed', 
        'rejected'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. audit_event_type
DO $$ BEGIN
    CREATE TYPE audit_event_type AS ENUM (
        'ORDER_CREATED',
        'ORDER_UPDATED',
        'ORDER_CANCELLED',
        'PAYMENT_SESSION_CREATED',
        'PAYMENT_PENDING',
        'PAYMENT_SUCCESS',
        'PAYMENT_FAILED',
        'PAYMENT_REVERSED',
        'REFUND_REQUESTED',
        'REFUND_APPROVED',
        'REFUND_COMPLETED',
        'CART_CREATED',
        'CART_UPDATED',
        'CART_CLEARED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
