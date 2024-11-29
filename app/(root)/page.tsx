import { redirect } from 'next/navigation';
import { v4 as uuidv4 } from "uuid";

export default function RedirectPage() {
  // Generate a new UUID and redirect
  redirect(`/${uuidv4()}`);
}