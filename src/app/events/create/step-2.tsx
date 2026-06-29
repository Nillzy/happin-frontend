import { Redirect } from 'expo-router';

// Step 2 wurde durch die generische Edit-Seite ersetzt (/event/{id}/edit).
// Dieser Redirect fängt alte Links ab.
export default function StepTwoRedirect() {
    return <Redirect href="/events/create" />;
}
