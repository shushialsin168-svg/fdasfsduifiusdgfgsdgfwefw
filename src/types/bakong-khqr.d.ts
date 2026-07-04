declare module 'bakong-khqr' {
  export interface KHQRStatus {
    code: number;
    errorCode: number | null;
    message: string | null;
  }

  export interface KHQRResponse {
    status: KHQRStatus;
    data: { qr: string; md5: string } | null;
  }

  export interface KHQROptionalData {
    currency?: number;
    amount?: number;
    billNumber?: string;
    storeLabel?: string;
    terminalLabel?: string;
    mobileNumber?: string;
    accountInformation?: string;
    acquiringBank?: string;
    purposeOfTransaction?: string;
    expirationTimestamp?: number;
    merchantCategoryCode?: string;
  }

  export class BakongKHQR {
    generateIndividual(info: IndividualInfo): KHQRResponse;
    generateMerchant(info: MerchantInfo): KHQRResponse;
  }

  export class IndividualInfo {
    constructor(
      bakongAccountID: string,
      merchantName: string,
      merchantCity: string,
      optional?: KHQROptionalData
    );
  }

  export class MerchantInfo {
    constructor(
      bakongAccountID: string,
      merchantName: string,
      merchantCity: string,
      merchantID: string,
      acquiringBank: string,
      optional?: KHQROptionalData
    );
  }

  export const khqrData: {
    currency: {
      usd: number;
      khr: number;
    };
    merchantType: {
      merchant: string;
      individual: string;
    };
  };
}
