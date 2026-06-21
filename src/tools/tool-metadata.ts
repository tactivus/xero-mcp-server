import {
  XeroToolCategory,
  XeroToolMetadata,
  XeroToolOperationType,
} from "../types/tool-definition.js";

const readTools = [
  "list-accounts",
  "list-aged-payables-by-contact",
  "list-aged-receivables-by-contact",
  "list-bank-transactions",
  "list-contact-groups",
  "list-contacts",
  "list-credit-notes",
  "list-invoices",
  "list-items",
  "list-manual-journals",
  "list-organisation-details",
  "list-payments",
  "list-payroll-employee-leave",
  "list-payroll-employee-leave-balances",
  "list-payroll-employee-leave-types",
  "list-payroll-employees",
  "list-payroll-leave-periods",
  "list-payroll-leave-types",
  "list-profit-and-loss",
  "list-quotes",
  "list-report-balance-sheet",
  "list-tax-rates",
  "list-timesheets",
  "list-tracking-categories",
  "list-trial-balance",
  "get-timesheet",
] as const;

const writeTools = [
  "add-timesheet-line",
  "create-bank-transaction",
  "create-contact",
  "create-credit-note",
  "create-invoice",
  "create-item",
  "create-manual-journal",
  "create-payment",
  "create-quote",
  "create-timesheet",
  "create-tracking-category",
  "create-tracking-options",
  "update-bank-transaction",
  "update-contact",
  "update-credit-note",
  "update-invoice",
  "update-item",
  "update-manual-journal",
  "update-quote",
  "update-timesheet-line",
  "update-tracking-category",
  "update-tracking-options",
] as const;

const destructiveWriteTools = [
  "approve-timesheet",
  "revert-timesheet",
] as const;

const destructiveTools = ["delete-timesheet"] as const;

const irreversibleTools = [
  "approve-timesheet",
  "create-payment",
  "delete-timesheet",
  "revert-timesheet",
] as const;

const categoryByPrefix: Record<string, XeroToolCategory> = {
  add: "update",
  approve: "update",
  create: "create",
  delete: "delete",
  get: "get",
  list: "list",
  revert: "update",
  update: "update",
};

function hostedNameFor(upstreamName: string): string {
  return `xero_${upstreamName.replaceAll("-", "_")}`;
}

function categoryFor(upstreamName: string): XeroToolCategory {
  const prefix = upstreamName.split("-")[0];
  const category = categoryByPrefix[prefix];

  if (!category) {
    throw new Error(`No Xero tool category configured for ${upstreamName}`);
  }

  return category;
}

function metadata(
  upstreamName: string,
  operationType: XeroToolOperationType,
): XeroToolMetadata {
  const destructive =
    operationType === "destructive" ||
    destructiveWriteTools.includes(
      upstreamName as (typeof destructiveWriteTools)[number],
    );
  const irreversible = irreversibleTools.includes(
    upstreamName as (typeof irreversibleTools)[number],
  );

  return {
    upstreamName,
    hostedName: hostedNameFor(upstreamName),
    operationType,
    category: categoryFor(upstreamName),
    destructive,
    irreversible,
    highRisk: destructive || irreversible,
  };
}

const metadataEntries = [
  ...readTools.map((name) => metadata(name, "read")),
  ...writeTools.map((name) => metadata(name, "write")),
  ...destructiveWriteTools.map((name) => metadata(name, "write")),
  ...destructiveTools.map((name) => metadata(name, "destructive")),
];

export const XeroToolMetadataByName = Object.freeze(
  Object.fromEntries(
    metadataEntries.map((entry) => [entry.upstreamName, entry]),
  ) as Record<string, XeroToolMetadata>,
);

export function getXeroToolMetadata(upstreamName: string): XeroToolMetadata {
  const metadata = XeroToolMetadataByName[upstreamName];

  if (!metadata) {
    throw new Error(`No Xero tool metadata configured for ${upstreamName}`);
  }

  return metadata;
}
