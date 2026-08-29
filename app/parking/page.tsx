import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ParkingApp } from "@/components/ParkingApp";

export default async function ParkingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  return <ParkingApp user={user} />;
}
