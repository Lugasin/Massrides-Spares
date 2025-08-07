import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />)

// Request notification permission and subscribe the user
if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
  Notification.requestPermission().then(async (permission) => {
    if (permission === 'granted') {
      console.log('Notification permission granted.');

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscribeOptions = {
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            'YOUR_PUBLIC_VAPID_KEY_HERE' // Replace with your actual public VAPID key
          ),
        };
        const subscription = await registration.pushManager.subscribe(subscribeOptions);
        console.log('Push Subscription:', JSON.stringify(subscription));
        // TODO: Send subscription to your backend server
      } catch (error) {
        console.error('Error subscribing for push notifications:', error);
      }
    } else {
      console.log('Notification permission denied.');
    }
  });
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
