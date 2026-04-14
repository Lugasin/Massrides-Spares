type PaymentPopup = Window | null;

const PAYMENT_WINDOW_NAME = 'massrides-payment';
const PAYMENT_WINDOW_FEATURES = 'width=540,height=840,scrollbars=yes,resizable=yes';

function writeLoadingState(popup: Window) {
  try {
    popup.document.title = 'Massrides Secure Payment';
    popup.document.body.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 32px; text-align: center; color: #0f172a;">
        <h2 style="margin-bottom: 12px;">Opening secure payment...</h2>
        <p style="margin: 0; color: #475569;">You can return to the main app while payment status updates.</p>
      </div>
    `;
  } catch {
    // Ignore cross-window document access issues.
  }
}

export function preparePaymentPopup(): PaymentPopup {
  if (typeof window === 'undefined') {
    return null;
  }

  const popup = window.open('', PAYMENT_WINDOW_NAME, PAYMENT_WINDOW_FEATURES);
  if (popup && !popup.closed) {
    writeLoadingState(popup);
  }

  return popup;
}

export function openPaymentLink(paymentLink: string) {
  const popup = window.open(paymentLink, PAYMENT_WINDOW_NAME, PAYMENT_WINDOW_FEATURES);
  if (popup && !popup.closed) {
    popup.focus();
    return true;
  }

  window.location.href = paymentLink;
  return false;
}

export function beginHostedPayment(args: {
  navigate: (to: string) => void;
  orderId: string | number;
  paymentLink: string;
  popup?: PaymentPopup;
}) {
  const { navigate, orderId, paymentLink, popup } = args;
  const orderIdString = String(orderId);
  const hasPopup = Boolean(popup && !popup.closed);
  const statusUrl = `/checkout/success?order=${encodeURIComponent(orderIdString)}${hasPopup ? '&popup=1' : ''}`;

  sessionStorage.setItem('last_checkout_order_id', orderIdString);
  sessionStorage.setItem('last_checkout_started_at', new Date().toISOString());
  sessionStorage.setItem('last_checkout_payment_link', paymentLink);

  if (hasPopup && popup) {
    popup.location.href = paymentLink;
    popup.focus();
    navigate(statusUrl);
    return { usedPopup: true, statusUrl };
  }

  navigate(statusUrl);
  return { usedPopup: false, statusUrl };
}

export function clearHostedPaymentSession() {
  sessionStorage.removeItem('last_checkout_order_id');
  sessionStorage.removeItem('last_checkout_started_at');
  sessionStorage.removeItem('last_checkout_payment_link');
}
