import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "You're offline",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="max-w-sm text-center">
        <CardHeader className="items-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
            <WifiOff className="size-6 text-muted-foreground" />
          </div>
          <CardTitle>You&apos;re offline</CardTitle>
          <CardDescription>
            This page hasn&apos;t been cached yet. Reconnect to the internet and try again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Pages you&apos;ve already visited will keep working without a connection.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
