import { useEffect } from "react";
import { useRouter, Slot } from "expo-router";
import { useSession } from "../../utils/ctx.jsx";

export default function ProtectedLayout({ children }) {
  const { session, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/");
    }
  }, [isLoading, session, router]);

  if (isLoading || !session) {
    return null;
  }

  return <Slot/>;
}