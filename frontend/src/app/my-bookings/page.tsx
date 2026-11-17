import { redirect } from "next/navigation";

// "My Bookings" ahora vive en la cuenta del cliente.
export default function MyBookingsPage() {
  redirect("/account");
}
