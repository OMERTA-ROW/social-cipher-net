import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen, ExternalLink } from "lucide-react";
import { DRAFT_FEE_TEMPLATE, FEE_REFERENCE_SOURCES, FEE_TEMPLATE_FIELDS } from "@/lib/feeReference";

/**
 * Administrator reference only: the shape a finished fee schedule needs, plus
 * the published provider pages the structure was modelled on. None of these
 * numbers are CyberLink prices.
 */
export const FeeReferencePanel = () => (
  <div className="space-y-6">
    <Card className="bg-card/60 border-primary/20 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5 text-primary" /> Draft fee template
        </CardTitle>
        <CardDescription>
          A planning worksheet. Every row is unset — CyberLink charges nothing here until a rate is configured and
          switched on. Example figures are the providers' own published prices, shown for comparison only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Charge</TableHead>
                <TableHead>Basis</TableHead>
                <TableHead>Paid by</TableHead>
                <TableHead>Comparison example</TableHead>
                <TableHead>Our rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DRAFT_FEE_TEMPLATE.map((row) => (
                <TableRow key={`${row.category}-${row.operation}`}>
                  <TableCell className="font-medium">
                    {row.label}
                    {row.rail && <div className="text-xs text-muted-foreground">{row.rail}</div>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.basis}</TableCell>
                  <TableCell className="text-sm capitalize">{row.payer}</TableCell>
                  <TableCell className="max-w-sm text-xs text-muted-foreground">
                    {row.benchmarkExample}
                    <div className="mt-1 italic">Source: {row.benchmarkSource}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">Not set</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Every rate needs all of these before it can go live</p>
          <ul className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
            {FEE_TEMPLATE_FIELDS.map((field) => (
              <li key={field}>• {field}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>

    <Card className="bg-card/60 border-primary/20 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg">Sources</CardTitle>
        <CardDescription>
          Published pages used to model the structure. They describe those companies' own pricing and imply no
          partnership with, or availability on, CyberLink.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {FEE_REFERENCE_SOURCES.map((source) => (
          <div key={source.url} className="rounded-lg border border-border/60 p-3">
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-2 font-medium text-primary hover:underline"
            >
              {source.provider} — {source.title}
              <ExternalLink className="h-3 w-3" />
            </a>
            <p className="mt-1 text-sm text-muted-foreground">{source.summary}</p>
            <p className="mt-1 text-xs text-muted-foreground">Checked {source.checkedOn}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  </div>
);

export default FeeReferencePanel;
