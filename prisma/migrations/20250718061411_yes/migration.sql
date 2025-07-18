/*
  Warnings:

  - You are about to drop the column `companyPrice` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `customerPrice` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `dealerPrice` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `inventory` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `packingUnit` on the `product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `product` DROP COLUMN `companyPrice`,
    DROP COLUMN `customerPrice`,
    DROP COLUMN `dealerPrice`,
    DROP COLUMN `inventory`,
    DROP COLUMN `packingUnit`;

-- CreateTable
CREATE TABLE `ProductVariant` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `packingVolume` TEXT NOT NULL,
    `companyPrice` DOUBLE NULL,
    `dealerPrice` DOUBLE NULL,
    `customerPrice` DOUBLE NOT NULL,
    `inventory` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ProductVariant` ADD CONSTRAINT `ProductVariant_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
