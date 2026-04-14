import { supabase } from '@/integrations/supabase/client';

type PushSubscriptionJSON = {
  endpoint?: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

type SyncPushOptions = {
  promptForPermission?: boolean;
  requireAuth?: boolean;
  authToken?: string;
};

const PUSH_PUBLIC_KEY_CACHE_KEY = 'massrides_push_public_key';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

async function getAuthHeaders(authToken?: string) {
  if (authToken) {
    return { Authorization: `Bearer ${authToken}` };
  }

  const { data: { session } } = await supabase.auth.getSession();
  return session ? { Authorization: `Bearer ${session.access_token}` } : undefined;
}

async function getServiceWorkerRegistration() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported in this browser.');
  }

  return navigator.serviceWorker.ready;
}

function isAuthFailure(error: unknown) {
  const candidate = error as { status?: number; context?: { status?: number }; message?: string } | null;
  const status = candidate?.status ?? candidate?.context?.status;
  const message = (candidate?.message || '').toLowerCase();

  return status === 401 || status === 403 || message.includes('unauthorized') || message.includes('forbidden');
}

async function getPublicPushKey() {
  const cachedKey = window.localStorage.getItem(PUSH_PUBLIC_KEY_CACHE_KEY);
  if (cachedKey) {
    return cachedKey;
  }

  const { data, error } = await supabase.functions.invoke('get-push-public-key');
  if (error || !data?.publicKey) {
    throw new Error(error?.message || 'Push notifications are not configured yet.');
  }

  window.localStorage.setItem(PUSH_PUBLIC_KEY_CACHE_KEY, data.publicKey);
  return data.publicKey as string;
}

async function syncSubscriptionWithBackend(
  subscription: PushSubscriptionJSON | null,
  options: SyncPushOptions = {},
) {
  const headers = await getAuthHeaders(options.authToken);
  if (!headers) {
    if (options.requireAuth) {
      throw new Error('You must be signed in to manage push notifications.');
    }

    return false;
  }

  if (!subscription?.endpoint) {
    const { error } = await supabase.functions.invoke('manage-push-subscription', {
      body: { action: 'remove' },
      headers,
    });

    if (error) {
      if (!options.requireAuth && isAuthFailure(error)) {
        return false;
      }
      throw new Error(error.message || 'Failed to remove push subscription.');
    }

    return true;
  }

  const { error } = await supabase.functions.invoke('manage-push-subscription', {
    body: {
      action: 'upsert',
      subscription,
    },
    headers,
  });

  if (error) {
    if (!options.requireAuth && isAuthFailure(error)) {
      return false;
    }
    throw new Error(error.message || 'Failed to save push subscription.');
  }

  return true;
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function syncPushSubscription(
  enabled: boolean,
  options: SyncPushOptions = {},
) {
  if (!isPushSupported()) {
    return {
      supported: false,
      subscribed: false,
    };
  }

  const registration = await getServiceWorkerRegistration();
  const existingSubscription = await registration.pushManager.getSubscription();

  if (!enabled) {
    if (existingSubscription) {
      await syncSubscriptionWithBackend(null, options);
      await existingSubscription.unsubscribe();
    } else {
      await syncSubscriptionWithBackend(null, options);
    }

    return {
      supported: true,
      subscribed: false,
    };
  }

  if (Notification.permission === 'denied') {
    if (!options.promptForPermission) {
      return {
        supported: true,
        subscribed: Boolean(existingSubscription),
      };
    }

    throw new Error('Push notifications are blocked in this browser.');
  }

  if (Notification.permission !== 'granted') {
    if (!options.promptForPermission) {
      return {
        supported: true,
        subscribed: Boolean(existingSubscription),
      };
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission was not granted.');
    }
  }

  const subscription = existingSubscription ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(await getPublicPushKey()),
  });

  const serializedSubscription = subscription.toJSON();
  if (
    !serializedSubscription.endpoint ||
    !serializedSubscription.keys?.p256dh ||
    !serializedSubscription.keys?.auth
  ) {
    throw new Error('Browser push subscription is missing required keys.');
  }

  await syncSubscriptionWithBackend(serializedSubscription, options);

  return {
    supported: true,
    subscribed: true,
  };
}
