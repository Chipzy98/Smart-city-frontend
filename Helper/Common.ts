import { NextRequest } from "next/server";

type ToastType = "success" | "error" | "info" | "warning";

export const constructQueryString = (params: {
  type?: number;
  employeetype?: number;
  status?: number;
  q?: string;
  page?: number;
  pagesize?: number;
  workspaceId?: string;
  year?: number;
  holidayYearId?: string;
}): string => {
  const query = new URLSearchParams();

  if (params.type !== undefined) query.append("type", params.type.toString());
  if (params.employeetype !== undefined)
    query.append("employeetype", params.employeetype.toString());
  if (params.status !== undefined)
    query.append("status", params.status.toString());
  if (params.q) query.append("q", params.q);
  if (params.page !== undefined) query.append("page", params.page.toString());
  if (params.pagesize !== undefined)
    query.append("pagesize", params.pagesize.toString());
  if (params.workspaceId) query.append("workspaceId", params.workspaceId);
  if (params.year !== undefined) query.append("year", params.year.toString());
  if (params.holidayYearId) query.append("holidayYearId", params.holidayYearId);

  return query.toString();
};

export const getPagedQueryParameters = (req: NextRequest) => {
  const type = req.nextUrl.searchParams.get("type");
  const employeetype = req.nextUrl.searchParams.get("employeetype");
  const status = req.nextUrl.searchParams.get("status");
  const q = req.nextUrl.searchParams.get("q");
  const page = req.nextUrl.searchParams.get("page");
  const pagesize = req.nextUrl.searchParams.get("pagesize");
  const workspaceId = req.nextUrl.searchParams.get("workspaceId");
  const holidayYearId = req.nextUrl.searchParams.get("holidayYearId");

  return {
    type: type ? parseInt(type, 10) : undefined,
    employeetype: employeetype ? parseInt(employeetype, 10) : undefined,
    status: status ? parseInt(status, 10) : undefined,
    q: q || undefined,
    page: page ? parseInt(page, 10) : undefined,
    pagesize: pagesize ? parseInt(pagesize, 10) : undefined,
    workspaceId: workspaceId || undefined,
    holidayYearId: holidayYearId || undefined,
  };
};

export const parseJwt = (token: string) => {
  if (!token) return null;

  const base64Payload = token.split(".")[1];
  if (!base64Payload) return null;

  return JSON.parse(Buffer.from(base64Payload, "base64").toString());
};

export const setRedirectToastMesage = (
  type: ToastType,
  message: string
) => {
  if (typeof window === "undefined") return;

  sessionStorage.setItem("toastType", type);
  sessionStorage.setItem("toastMessage", message);
};

export const showRedirectedToastMesage = () => {
  if (typeof window === "undefined") return;

  const type = sessionStorage.getItem("toastType");
  const message = sessionStorage.getItem("toastMessage");

  if (type && message) {
    alert(`${type.toUpperCase()}: ${message}`);

    sessionStorage.removeItem("toastType");
    sessionStorage.removeItem("toastMessage");
  }
};

export const showToastMesage = (
  type: ToastType,
  message: string,
  callback?: () => void
) => {
  alert(`${type.toUpperCase()}: ${message}`);

  if (callback) {
    setTimeout(() => {
      callback();
    }, 2000);
  }
};

export const getDecryptedSToken = (sTokenEncrypted?: string) => {
  return sTokenEncrypted ?? "";
};

export const getEncodeImageId = (nic: string) => {
  if (!nic) return null;

  return btoa(`${nic}.jpg`);
};