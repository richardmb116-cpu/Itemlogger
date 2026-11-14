import { Redirect } from 'expo-router';

/** Any unknown address (e.g. when the web preview is hosted under another path) goes to the item list. */
export default function NotFound() {
  return <Redirect href="/" />;
}
