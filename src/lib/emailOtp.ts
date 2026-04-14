import { supabase } from '@/integrations/supabase/client';

export type OtpFlowType = 'signup' | 'magiclink';

type VerifyOtpType = 'signup' | 'magiclink' | 'email';

const OTP_VERIFY_SEQUENCE: Record<OtpFlowType, VerifyOtpType[]> = {
  signup: ['signup', 'email', 'magiclink'],
  magiclink: ['magiclink', 'email', 'signup'],
};

const normaliseEmail = (email: string) => email.trim().toLowerCase();

export const resolveOtpFlowType = async (email: string): Promise<OtpFlowType> => {
  try {
    const { data, error } = await supabase.functions.invoke('check-email', {
      body: {
        email: normaliseEmail(email),
      },
    });

    if (error) {
      throw error;
    }

    return data?.exists ? 'magiclink' : 'signup';
  } catch (error) {
    console.error('Failed to resolve OTP flow type, defaulting to signup:', error);
    return 'signup';
  }
};

interface SendEmailOtpOptions {
  email: string;
  metadata?: Record<string, unknown>;
  flowType?: OtpFlowType;
}

export const sendEmailOtp = async ({
  email,
  metadata,
  flowType,
}: SendEmailOtpOptions): Promise<OtpFlowType> => {
  const resolvedFlowType = flowType ?? await resolveOtpFlowType(email);

  const { error } = await supabase.auth.signInWithOtp({
    email: normaliseEmail(email),
    options: {
      shouldCreateUser: resolvedFlowType === 'signup',
      data: metadata,
    },
  });

  if (error) {
    throw error;
  }

  return resolvedFlowType;
};

interface VerifyEmailOtpOptions {
  email: string;
  token: string;
  preferredFlow: OtpFlowType;
}

export const verifyEmailOtp = async ({
  email,
  token,
  preferredFlow,
}: VerifyEmailOtpOptions) => {
  const normalisedEmail = normaliseEmail(email);
  let lastError: Error | null = null;

  for (const type of OTP_VERIFY_SEQUENCE[preferredFlow]) {
    const { data, error } = await supabase.auth.verifyOtp({
      email: normalisedEmail,
      token,
      type,
    });

    if (!error) {
      return data;
    }

    lastError = error;
  }

  throw lastError ?? new Error('OTP verification failed');
};
