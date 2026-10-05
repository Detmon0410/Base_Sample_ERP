import { BellIcon, BuildingIcon, InfoIcon, PlusIcon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ActiveBadge } from "@/components/common/ActiveBadge";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable } from "@/components/common/DataTable";
import { DetailFields, DetailSection } from "@/components/common/DetailLayout";
import { DetailSheet } from "@/components/common/DetailSheet";
import { EntitySelect } from "@/components/common/EntitySelect";
import { FormField } from "@/components/common/FormField";
import { FormFooter } from "@/components/common/FormFooter";
import { FormSection } from "@/components/common/FormSection";
import { LanguageFlag } from "@/components/common/LanguageFlag";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { LinkedDocuments } from "@/components/common/LinkedDocuments";
import { RecordActions } from "@/components/common/RecordActions";
import { RecordInfoCard } from "@/components/common/RecordInfoCard";
import { SheetSection } from "@/components/common/SheetSection";
import { MoneyInput } from "@/components/common/MoneyInput";
import { Pagination } from "@/components/common/Pagination";
import { StatusBadge } from "@/components/common/StatusBadge";
import { StatusTimeline } from "@/components/common/StatusTimeline";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Developer-only page (route /dev/testcomponents, exists only in `npm run kanou` / dev server).
// Every UI component of the app, one under the other, so look and size can be reviewed in one place.
// Texts here are not translated on purpose.

const SECTIONS = [
  ["shadcn", "shadcn/ui components"],
  ["button", "Button"],
  ["badge", "Badge"],
  ["alert", "Alert"],
  ["card", "Card"],
  ["input", "Input, Textarea, Label"],
  ["select", "Select"],
  ["field", "Field"],
  ["tabs", "Tabs"],
  ["table", "Table"],
  ["overlays", "Dialog, Sheet, Popover, Dropdown, Tooltip, Toast"],
  ["misc", "Avatar, Progress, Skeleton, Separator, Collapsible, ScrollArea, Breadcrumb"],
  ["app", "App components"],
  ["status", "StatusBadge, ActiveBadge"],
  ["forms", "FormField, FormSection, MoneyInput, EntitySelect, FormFooter"],
  ["detail", "DetailSection, DetailFields, StatusTimeline, LinkedDocuments"],
  ["datatable", "DataTable, Pagination"],
  ["dialogs", "ConfirmDialog, DetailSheet, SheetSection, RecordActions"],
  ["language", "LanguageFlag, LanguageSwitcher"],
  ["notshown", "Not shown here"],
];

function Section({ id, title, note, children }) {
  return (
    <section id={id} className="scroll-mt-20 rounded-xl border bg-card p-6">
      <h2 className="text-xl font-bold">{title}</h2>
      {note ? <p className="mt-1 text-sm text-muted-foreground">{note}</p> : null}
      <div className="mt-5 flex flex-col gap-5">{children}</div>
    </section>
  );
}

const Row = ({ label, children }) => (
  <div className="flex flex-col gap-2">
    {label ? <p className="text-sm font-semibold text-muted-foreground">{label}</p> : null}
    <div className="flex flex-wrap items-center gap-3">{children}</div>
  </div>
);

const ENTITIES = [
  { id: 1, code: "COMP", name: "Compressor" },
  { id: 2, code: "DOOR", name: "Door panel" },
  { id: 3, code: "FOAM", name: "Insulation foam" },
];

const TABLE_ROWS = [
  { id: 1, code: "C001", name: "ABC Appliance Store", status: "active", total: 5000000 },
  { id: 2, code: "C002", name: "Best Home Mart", status: "inactive", total: 3000000 },
  { id: 3, code: "C003", name: "Sakura Retail", status: "active", total: 1000000 },
];

export function TestComponentsPage() {
  const [dialog, setDialog] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [entity, setEntity] = useState("");
  const [sort, setSort] = useState("code");
  const [page, setPage] = useState(3);
  const [tableStatus, setTableStatus] = useState("ready");

  const columns = [
    { key: "code", header: "Code", sortable: true, className: "font-semibold" },
    { key: "name", header: "Name", sortable: true },
    { key: "total", header: "Credit limit", align: "right", render: (row) => `¥${row.total.toLocaleString()}` },
    { key: "status", header: "Status", render: (row) => <ActiveBadge status={row.status} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">UI components</h1>
        <p className="text-muted-foreground">
          Developer page: every component of the app in one list. The sidebar and top bar are not repeated here because this page is already inside them.
        </p>
      </div>

      <nav aria-label="Components" className="rounded-xl border bg-card p-5">
        <p className="mb-3 font-semibold">Jump to</p>
        <ul className="grid gap-x-6 gap-y-1 md:grid-cols-2">
          {SECTIONS.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="text-primary underline-offset-4 hover:underline">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <h2 id="shadcn" className="scroll-mt-20 text-2xl font-bold">
        shadcn/ui components
      </h2>

      <Section id="button" title="Button" note="Sizes keep a target of 40px or more; the default is 44px.">
        <Row label="Variants (default size)">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
          <Button disabled>Disabled</Button>
        </Row>
        <Row label="Sizes">
          <Button size="xs">xs 32px</Button>
          <Button size="sm">sm 40px</Button>
          <Button>default 44px</Button>
          <Button size="lg">lg 48px</Button>
        </Row>
        <Row label="With icon / icon only">
          <Button>
            <PlusIcon /> New record
          </Button>
          <Button variant="outline" size="icon" aria-label="Notifications">
            <BellIcon />
          </Button>
          <Button variant="outline" size="icon-sm" aria-label="Notifications">
            <BellIcon />
          </Button>
        </Row>
      </Section>

      <Section id="badge" title="Badge" note="Plain badge. For status chips use StatusBadge below (text + icon).">
        <Row>
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </Row>
      </Section>

      <Section id="alert" title="Alert">
        <Alert>
          <InfoIcon />
          <AlertTitle>Default alert</AlertTitle>
          <AlertDescription>Use for information that is not an error.</AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>Destructive alert</AlertTitle>
          <AlertDescription>Could not refresh the data. The last values are still shown.</AlertDescription>
        </Alert>
      </Section>

      <Section id="card" title="Card">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Card title</CardTitle>
            <CardDescription>Short description of the card.</CardDescription>
          </CardHeader>
          <CardContent>Card content goes here.</CardContent>
          <CardFooter className="gap-3">
            <Button>Primary</Button>
            <Button variant="outline">Secondary</Button>
          </CardFooter>
        </Card>
      </Section>

      <Section id="input" title="Input, Textarea, Label" note="Input height is 44px.">
        <div className="grid max-w-xl gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="t-input">Text input</Label>
            <Input id="t-input" placeholder="Placeholder" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="t-input-d">Disabled</Label>
            <Input id="t-input-d" disabled defaultValue="Cannot edit" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="t-input-i">Invalid</Label>
            <Input id="t-input-i" aria-invalid defaultValue="Wrong value" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="t-textarea">Textarea</Label>
            <Textarea id="t-textarea" placeholder="Several lines" />
          </div>
        </div>
      </Section>

      <Section id="select" title="Select">
        <div className="grid max-w-sm gap-1.5">
          <Label htmlFor="t-select">Payment terms</Label>
          <Select defaultValue="NET_30">
            <SelectTrigger id="t-select" className="w-full">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NET_15">Net 15</SelectItem>
              <SelectItem value="NET_30">Net 30</SelectItem>
              <SelectItem value="COD">Cash on delivery</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Section>

      <Section id="field" title="Field" note="Label, control, hint and error as one unit.">
        <div className="grid max-w-xl gap-5">
          <Field>
            <FieldLabel htmlFor="t-field-1">With a hint</FieldLabel>
            <Input id="t-field-1" />
            <FieldDescription>This hint helps the user fill the field.</FieldDescription>
          </Field>
          <Field data-invalid>
            <FieldLabel htmlFor="t-field-2">With an error</FieldLabel>
            <Input id="t-field-2" aria-invalid />
            <FieldError>This field is required.</FieldError>
          </Field>
        </div>
      </Section>

      <Section id="tabs" title="Tabs">
        <Tabs defaultValue="a" className="rounded-xl border">
          <TabsList>
            <TabsTrigger value="a">Details</TabsTrigger>
            <TabsTrigger value="b">Suppliers</TabsTrigger>
            <TabsTrigger value="c" disabled>
              Disabled
            </TabsTrigger>
          </TabsList>
          <TabsContent value="a" className="p-5">
            Content of the first tab.
          </TabsContent>
          <TabsContent value="b" className="p-5">
            Content of the second tab.
          </TabsContent>
        </Tabs>
      </Section>

      <Section id="table" title="Table" note="Plain table. For lists with sorting and paging use DataTable below.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {TABLE_ROWS.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-semibold">{row.code}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell className="text-right">¥{row.total.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section id="overlays" title="Dialog, Sheet, Popover, Dropdown, Tooltip, Toast" note="Click to open each one.">
        <Row>
          <Button variant="outline" onClick={() => setDialog(true)}>
            Alert dialog
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Sheet (right)</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Sheet title</SheetTitle>
                <SheetDescription>The plain sheet. Detail pages use DetailSheet.</SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">Popover</Button>
            </PopoverTrigger>
            <PopoverContent className="p-4">Popover content</PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Dropdown menu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>My account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem variant="destructive">Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Tooltip (hover)</Button>
            </TooltipTrigger>
            <TooltipContent>Tooltip text</TooltipContent>
          </Tooltip>
          <Button variant="outline" onClick={() => toast.success("Saved")}>
            Toast: success
          </Button>
          <Button variant="outline" onClick={() => toast.error("Something went wrong. Please try again.")}>
            Toast: error
          </Button>
        </Row>
      </Section>

      <Section id="misc" title="Avatar, Progress, Skeleton, Separator, Collapsible, ScrollArea, Breadcrumb">
        <Row label="Avatar">
          <Avatar>
            <AvatarFallback className="bg-primary text-primary-foreground">DA</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>AS</AvatarFallback>
          </Avatar>
        </Row>
        <Row label="Progress (65%)">
          <Progress value={65} className="max-w-md" aria-label="Progress" />
        </Row>
        <Row label="Skeleton">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="size-12 rounded-full" />
        </Row>
        <Row label="Separator">
          <div className="w-full max-w-md">
            <p>Above</p>
            <Separator className="my-3" />
            <p>Below</p>
          </div>
        </Row>
        <Row label="Collapsible">
          <Collapsible className="w-full max-w-md rounded-lg border p-4">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm">
                Show / hide
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">Hidden content that opens.</CollapsibleContent>
          </Collapsible>
        </Row>
        <Row label="ScrollArea">
          <ScrollArea className="h-32 w-full max-w-md rounded-lg border p-3">
            {Array.from({ length: 12 }, (_, index) => (
              <p key={index}>Line {index + 1}</p>
            ))}
          </ScrollArea>
        </Row>
        <Row label="Breadcrumb">
          <Breadcrumb>
            <BreadcrumbList className="text-base">
              <BreadcrumbItem>
                <BreadcrumbLink href="#misc">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="#misc">Master Data</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Materials</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </Row>
      </Section>

      <h2 id="app" className="scroll-mt-20 text-2xl font-bold">
        App components
      </h2>

      <Section id="status" title="StatusBadge, ActiveBadge" note="Meaning is always text plus icon, never color alone.">
        <Row label="StatusBadge tones">
          <StatusBadge tone="success">Approved</StatusBadge>
          <StatusBadge tone="warning">Near shortage</StatusBadge>
          <StatusBadge tone="danger">Shortage</StatusBadge>
          <StatusBadge tone="neutral">Draft</StatusBadge>
        </Row>
        <Row label="ActiveBadge">
          <ActiveBadge status="active" />
          <ActiveBadge status="inactive" />
        </Row>
      </Section>

      <Section id="forms" title="FormField, FormSection, MoneyInput, EntitySelect, FormFooter">
        <FormSection title="Form section">
          <FormField id="t-ff-1" label="Customer code" required hint="The code cannot be changed after it is created.">
            <Input id="t-ff-1" placeholder="C001" />
          </FormField>
          <FormField id="t-ff-2" label="Customer name" required error="This field is required.">
            <Input id="t-ff-2" aria-invalid />
          </FormField>
          <FormField id="t-ff-3" label="Credit limit">
            <MoneyInput id="t-ff-3" placeholder="0" />
          </FormField>
          <FormField id="t-ff-4" label="Material (searchable)">
            <EntitySelect id="t-ff-4" options={ENTITIES} value={entity} onChange={setEntity} placeholder="Select a material" />
          </FormField>
        </FormSection>
        <div className="overflow-hidden rounded-xl border">
          <form onSubmit={(event) => event.preventDefault()}>
            <FormFooter inSheet onCancel={() => toast("Cancel clicked")}>
              <Button type="button" variant="outline">
                Deactivate
              </Button>
              <Button type="button" variant="destructive">
                Delete
              </Button>
            </FormFooter>
          </form>
        </div>
      </Section>

      <Section id="detail" title="DetailSection, DetailFields, StatusTimeline, LinkedDocuments">
        <DetailSection title="Customer" actions={<Button size="sm" variant="outline">Edit</Button>}>
          <DetailFields
            items={[
              { label: "Customer", value: "ABC Appliance Store" },
              { label: "Payment terms", value: "Net 30" },
              { label: "Remarks", value: "", wide: true },
            ]}
          />
        </DetailSection>
        <div className="grid gap-5 lg:grid-cols-2">
          <StatusTimeline
            events={[
              { id: 3, label: "Approved", actor: "Alice Sato", at: "2026-10-03T11:00:00", tone: "success" },
              { id: 2, label: "Rejected", actor: "Bob Mori", at: "2026-10-02T15:30:00", tone: "danger", note: "Quantity too high." },
              { id: 1, label: "Created", actor: "Nina Sato", at: "2026-10-02T09:05:00", tone: "neutral" },
            ]}
          />
          <LinkedDocuments
            items={[
              { id: "so", type: "Sale Order", number: "SO-2026-0017", to: "/", status: <StatusBadge tone="neutral">Draft</StatusBadge> },
              { id: "po", type: "Customer PO", number: "PO-ACME-9931" },
            ]}
          />
        </div>
      </Section>

      <Section id="datatable" title="DataTable, Pagination" note="Click a header to sort; the buttons below switch the loading and error states.">
        <Row>
          {["ready", "loading", "error"].map((status) => (
            <Button key={status} size="sm" variant={tableStatus === status ? "default" : "outline"} onClick={() => setTableStatus(status)}>
              {status}
            </Button>
          ))}
        </Row>
        <DataTable
          ariaLabel="Example table"
          columns={columns}
          rows={tableStatus === "ready" ? TABLE_ROWS : []}
          status={tableStatus}
          sort={sort}
          onSortChange={setSort}
          onRetry={() => setTableStatus("ready")}
          skeletonRows={3}
          emptyContent="No records."
        />
        <Pagination page={page} pageSize={20} total={134} onChange={setPage} />
      </Section>

      <Section id="dialogs" title="ConfirmDialog, DetailSheet, SheetSection, RecordActions" note="Same dialog and sheet that the forms use: white header with icon actions, grey (#F1F5F9) body, white cards with a shadow below (they do not fold); the sheet width is changed by dragging its left edge.">
        <Row>
          <Button variant="outline" onClick={() => setDialog(true)}>
            Open ConfirmDialog
          </Button>
          <Button variant="outline" onClick={() => setDetailOpen(true)}>
            Open DetailSheet
          </Button>
        </Row>
      </Section>

      <Section id="language" title="LanguageFlag, LanguageSwitcher" note="The language menu in the top bar uses the same flags.">
        <Row>
          <LanguageFlag code="en" />
          <LanguageFlag code="ja" />
          <LanguageFlag code="en" size="sm" />
          <LanguageFlag code="ja" size="sm" />
          <LanguageSwitcher />
        </Row>
      </Section>

      <Section id="notshown" title="Not shown here">
        <ul className="list-disc pl-6 text-muted-foreground">
          <li>Sidebar, AppHeader, UserMenu, LanguageMenu, Breadcrumbs: the app frame around this page.</li>
          <li>ListPage, ApprovalActions, RecordDialogs, PageHeader: need data or a signed-in role; see /master/customers and /dev/foundation.</li>
          <li>MessagePage: the full-screen 403 / 404 pages.</li>
        </ul>
      </Section>

      <ConfirmDialog
        open={dialog}
        onOpenChange={setDialog}
        title="Delete this record?"
        description="This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => {
          setDialog(false);
          toast.success("Deleted");
        }}
        destructive
      />
      {detailOpen ? (
        <DetailSheet
          title="DETAIL · Example record"
          badge={<ActiveBadge status="active" />}
          onClose={() => setDetailOpen(false)}
          actions={<RecordActions formId="demo-form" isNew={false} isActive onToggleStatus={() => toast("Deactivate clicked")} onDelete={() => toast("Delete clicked")} />}
        >
          <form id="demo-form" onSubmit={(event) => { event.preventDefault(); toast.success("Saved"); }} className="flex min-h-0 flex-1 flex-col">
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
              <SheetSection title="Basic information" icon={BuildingIcon}>
                <p>Save in the header submits this form. Drag the three dots on the left edge of the sheet to make it wider or narrower.</p>
              </SheetSection>
              <SheetSection title="Second card" icon={InfoIcon}>
                <p>Cards do not fold.</p>
              </SheetSection>
              <RecordInfoCard record={{ createdAt: "2026-09-01T09:00:00Z", updatedAt: "2026-10-05T10:20:00Z" }} />
            </div>
          </form>
        </DetailSheet>
      ) : null}
    </div>
  );
}
