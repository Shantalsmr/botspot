export { ok, fail, type ApiResult, type ApiSuccess, type ApiFailure } from "./lib/api-response";
export { getHealthReport, type HealthReport } from "./services/health.service";
export {
  BookingError,
  confirmBookingFromSession,
  createBookingCheckout,
  getDayAvailability,
  handleStripeWebhook,
  type BookingSummary,
  type CreateCheckoutInput,
} from "./services/booking.service";
export { clientIdFromHeaders } from "./lib/client-id";
export {
  InquiryError,
  createInquiry,
  listInquiries,
  type InquiryInput,
  type InquirySummary,
  type InquiryType,
} from "./services/inquiry.service";
export {
  ADMIN_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  AdminError,
  getAdminDashboard,
  isAdminConfigured,
  loginAdmin,
  verifyAdminSession,
  type AdminBooking,
  type AdminDashboard,
  type DayRevenue,
} from "./services/admin.service";
export { isEmailConfigured } from "./lib/email";
export {
  AccountError,
  CUSTOMER_COOKIE,
  CUSTOMER_SESSION_MAX_AGE,
  getCustomerFromSession,
  loginCustomer,
  registerCustomer,
  requestPasswordReset,
  resetPassword,
  updateCustomerProfile,
  type Customer,
} from "./services/customer.service";
export {
  RequestError,
  createBookingRequest,
  listCustomerBookings,
  resolveRequest,
  type AdminRequest,
  type CustomerBooking,
} from "./services/booking-request.service";
export {
  OrderError,
  confirmOrderFromSession,
  createOrderCheckout,
  listPaidOrders,
  type CreateOrderInput,
  type OrderLine,
  type OrderSummary,
} from "./services/order.service";
export { getGiftPaidBooking } from "./services/booking.service";
export {
  GiftCardError,
  checkGiftCardForBooking,
  lookupGiftCard,
  redeemInStore,
  type GiftCardSummary,
  type GiftMovement,
  type IssuedCode,
} from "./services/giftcard.service";
export {
  LOCATIONS,
  TerminalError,
  addTerminalSale,
  deleteTerminalSale,
  type LocationId,
  type TerminalSale,
} from "./services/terminal.service";
export type { RevenueSource, SourceTotals } from "./services/admin.service";
