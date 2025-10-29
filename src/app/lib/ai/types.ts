export type Insight = { label: string; value: string };

export type CTA = {
    label: string;
    action: 'route' | 'export_csv' | 'copy_trade' | 'open_top_holders' | 'create_watch' | 'suggest';
    payload?: Record<string, any>;
};

export type ServiceKind =
    | 'new_listings'
    | 'top_holders'
    | 'price'
    | 'generic_info'
    | 'generic';

export type ServiceResult = {
    kind: ServiceKind;
    insights: Insight[];
    summary?: string;                    // for generic info answers
    table?: Array<Record<string, any>>;  // for tabular service data
    suggestions?: string[];              // optional suggested follow-ups
};

export type RoutedResult =
    | {
        ok: true;
        wallet: string | null;
        data: {
            insights: Insight[];
            ctas: CTA[];
            summary?: string;
            table?: Array<Record<string, any>>;
            suggestions?: string[];
        };
    }
    | { ok: false; error: string };
