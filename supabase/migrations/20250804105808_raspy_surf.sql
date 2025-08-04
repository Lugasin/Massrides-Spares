/*
  # Authentication triggers and email notifications

  1. Functions
    - `handle_new_user()` - Creates user profile when new user signs up
    - `send_welcome_email()` - Sends welcome email notification
  
  2. Triggers
    - Trigger on auth.users insert to create profile
    - Trigger to send welcome email
  
  3. Security
    - Functions are security definer to bypass RLS
    - Proper error handling and logging
*/

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile
  INSERT INTO public.user_profiles (
    user_id,
    email,
    full_name,
    phone,
    company_name,
    role
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    'customer'::app_role
  );

  -- Send welcome notification
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    read
  ) 
  SELECT 
    up.id,
    'Welcome to Massrides!',
    'Thank you for joining Massrides Agriculture. Your account has been created successfully. Start exploring our premium agricultural equipment.',
    'info',
    false
  FROM public.user_profiles up
  WHERE up.user_id = NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to send email confirmation success notification
CREATE OR REPLACE FUNCTION handle_email_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if email was just confirmed
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    -- Send email confirmation success notification
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      read
    ) 
    SELECT 
      up.id,
      'Email Confirmed Successfully!',
      'Your email has been verified. You now have full access to all Massrides features including placing orders and requesting quotes.',
      'success',
      false
    FROM public.user_profiles up
    WHERE up.user_id = NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the update
    RAISE LOG 'Error in handle_email_confirmed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for email confirmation
DROP TRIGGER IF EXISTS on_email_confirmed ON auth.users;
CREATE TRIGGER on_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_email_confirmed();