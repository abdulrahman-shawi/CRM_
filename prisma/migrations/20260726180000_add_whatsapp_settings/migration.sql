-- Add WhatsApp Cloud API settings to GeneralSetting (fallback to env vars when null)
ALTER TABLE "GeneralSetting" ADD COLUMN "whatsappCloudApiToken" TEXT;
ALTER TABLE "GeneralSetting" ADD COLUMN "whatsappPhoneNumberId" TEXT;
ALTER TABLE "GeneralSetting" ADD COLUMN "whatsappApiVersion" TEXT;
