import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { WifiOff, RefreshCcw, X, AlertTriangle } from 'lucide-react';

interface ConnectionRefreshPromptProps {
    isVisible: boolean;
    onRefresh: () => void;
    onDismiss: () => void;
    connectionFailureCount?: number;
    latency?: number;
}

export const ConnectionRefreshPrompt = ({
    isVisible,
    onRefresh,
    onDismiss,
    connectionFailureCount = 0,
    latency = -1
}: ConnectionRefreshPromptProps) => {
    const [isRefreshing, setIsRefreshing] = useState(false);

    if (!isVisible) return null;

    const handleRefresh = () => {
        setIsRefreshing(true);
        try {
            onRefresh();
        } finally {
            // Add a small delay to show the refreshing state
            setTimeout(() => setIsRefreshing(false), 500);
        }
    };

    const getConnectionIssueText = () => {
        if (connectionFailureCount >= 3) {
            return "Multiple connection failures detected";
        }
        if (latency > 5000) {
            return "Very high latency detected";
        }
        return "Connection issues detected";
    };

    return (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top-2 duration-300">
            <Alert className="border-destructive bg-destructive/5 border shadow-lg">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <WifiOff className="h-4 w-4" />
                        Connection Problem
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onDismiss}
                        className="h-6 w-6 p-0 hover:bg-destructive/10"
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </AlertTitle>
                <AlertDescription className="space-y-3">
                    <div className="space-y-2">
                        <p className="text-sm">
                            {getConnectionIssueText()}. Real-time updates may not be working properly.
                        </p>
                        <div className="flex items-center gap-2">
                            {connectionFailureCount > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                    {connectionFailureCount} failures
                                </Badge>
                            )}
                            {latency > 0 && (
                                <Badge
                                    variant={latency > 5000 ? "destructive" : "secondary"}
                                    className="text-xs"
                                >
                                    {latency > 1000 ? `${(latency / 1000).toFixed(1)}s` : `${latency}ms`}
                                </Badge>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            size="sm"
                            className="flex-1"
                        >
                            {isRefreshing ? (
                                <>
                                    <RefreshCcw className="mr-2 h-3 w-3 animate-spin" />
                                    Refreshing...
                                </>
                            ) : (
                                <>
                                    <RefreshCcw className="mr-2 h-3 w-3" />
                                    Refresh Page
                                </>
                            )}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Refreshing the page can help restore the connection to real-time updates.
                    </p>
                </AlertDescription>
            </Alert>
        </div>
    );
};
