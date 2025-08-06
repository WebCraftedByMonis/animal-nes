/*
  Warnings:

  - A unique constraint covering the columns `[title]` on the table `AnimalNews` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,productId,variantId]` on the table `CartItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[mobileNumber]` on the table `JobApplicant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[partnerEmail]` on the table `Partner` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `variantId` to the `CartItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `cartitem` DROP FOREIGN KEY `CartItem_userId_fkey`;

-- DropIndex
DROP INDEX `CartItem_userId_productId_key` ON `cartitem`;

-- DropIndex
DROP INDEX `CompanyImage_url_key` ON `companyimage`;

-- AlterTable
ALTER TABLE `applicantcv` MODIFY `url` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `applicantimage` MODIFY `url` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `cartitem` ADD COLUMN `variantId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `checkout` ADD COLUMN `shipmentcharges` TEXT NULL,
    MODIFY `address` TEXT NOT NULL,
    MODIFY `shippingAddress` TEXT NOT NULL,
    MODIFY `paymentMethod` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `checkoutitem` ADD COLUMN `variantId` INTEGER NULL;

-- AlterTable
ALTER TABLE `companyimage` MODIFY `url` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `jobapplicant` MODIFY `address` TEXT NOT NULL,
    MODIFY `qualification` TEXT NULL,
    MODIFY `expectedPosition` TEXT NULL,
    MODIFY `preferredIndustry` TEXT NULL,
    MODIFY `preferredLocation` TEXT NULL,
    MODIFY `highestDegree` TEXT NULL,
    MODIFY `degreeInstitution` TEXT NULL,
    MODIFY `majorFieldOfStudy` TEXT NULL,
    MODIFY `workExperience` TEXT NULL,
    MODIFY `previousCompany` TEXT NULL;

-- AlterTable
ALTER TABLE `jobform` MODIFY `name` TEXT NOT NULL,
    MODIFY `company` TEXT NOT NULL,
    MODIFY `position` TEXT NOT NULL,
    MODIFY `eligibility` TEXT NOT NULL,
    MODIFY `benefits` TEXT NOT NULL,
    MODIFY `location` TEXT NOT NULL,
    MODIFY `companyAddress` TEXT NOT NULL,
    MODIFY `howToApply` TEXT NOT NULL,
    MODIFY `noofpositions` TEXT NOT NULL,
    MODIFY `deadline` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `jobformimage` MODIFY `url` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `newsimage` MODIFY `url` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `newspdf` MODIFY `url` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `partnerimage` MODIFY `url` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `product` MODIFY `description` TEXT NULL;

-- AlterTable
ALTER TABLE `productimage` MODIFY `url` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `productpdf` MODIFY `url` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `sellanimalimage` MODIFY `url` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `sellanimalvideo` MODIFY `url` TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `AnimalNews_title_key` ON `AnimalNews`(`title`);

-- CreateIndex
CREATE UNIQUE INDEX `CartItem_userId_productId_variantId_key` ON `CartItem`(`userId`, `productId`, `variantId`);

-- CreateIndex
CREATE UNIQUE INDEX `JobApplicant_mobileNumber_key` ON `JobApplicant`(`mobileNumber`);

-- CreateIndex
CREATE UNIQUE INDEX `Partner_partnerEmail_key` ON `Partner`(`partnerEmail`);

-- AddForeignKey
ALTER TABLE `Account` ADD CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CartItem` ADD CONSTRAINT `CartItem_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CheckoutItem` ADD CONSTRAINT `CheckoutItem_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
