-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: kanou_mini_erp
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `_prisma_migrations`
--

DROP TABLE IF EXISTS `_prisma_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checksum` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logs` text COLLATE utf8mb4_unicode_ci,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_prisma_migrations`
--

LOCK TABLES `_prisma_migrations` WRITE;
/*!40000 ALTER TABLE `_prisma_migrations` DISABLE KEYS */;
INSERT INTO `_prisma_migrations` VALUES ('62d4cb2f-a472-4744-8d03-c20b2490b849','9f959b76240744b06936ef5979031224f2091e9b652876f690ee9a92d9d2fb7c','2026-10-19 03:33:35.535','20261016075246_erp_schema',NULL,NULL,'2026-10-19 03:33:33.243',1),('79bfb4f6-0c6e-4462-8050-60adae8974a8','7566e0b8752e1f748d6b716d994faae241e08edda78eef2f6345acf15d4009bc','2026-10-19 03:33:33.232','20261001030932_init',NULL,NULL,'2026-10-19 03:33:33.180',1);
/*!40000 ALTER TABLE `_prisma_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attachment`
--

DROP TABLE IF EXISTS `attachment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attachment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ownerType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ownerId` int NOT NULL,
  `kind` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fileName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fileType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `size` int NOT NULL,
  `filePath` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `uploadedBy` int NOT NULL,
  `at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Attachment_ownerType_ownerId_idx` (`ownerType`,`ownerId`),
  KEY `Attachment_uploadedBy_idx` (`uploadedBy`),
  CONSTRAINT `Attachment_uploadedBy_fkey` FOREIGN KEY (`uploadedBy`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attachment`
--

LOCK TABLES `attachment` WRITE;
/*!40000 ALTER TABLE `attachment` DISABLE KEYS */;
/*!40000 ALTER TABLE `attachment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer`
--

DROP TABLE IF EXISTS `customer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `telephone` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer`
--

LOCK TABLES `customer` WRITE;
/*!40000 ALTER TABLE `customer` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoice`
--

DROP TABLE IF EXISTS `invoice`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoiceNumber` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoiceDate` date NOT NULL,
  `orderId` int NOT NULL,
  `customerName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customerAddress` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `total` int NOT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Unpaid',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Invoice_invoiceNumber_key` (`invoiceNumber`),
  UNIQUE KEY `Invoice_orderId_key` (`orderId`),
  CONSTRAINT `Invoice_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `productionorder` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoice`
--

LOCK TABLES `invoice` WRITE;
/*!40000 ALTER TABLE `invoice` DISABLE KEYS */;
/*!40000 ALTER TABLE `invoice` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoiceline`
--

DROP TABLE IF EXISTS `invoiceline`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoiceline` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoiceId` int NOT NULL,
  `productCode` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `productName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL,
  `unitPrice` int NOT NULL,
  `amount` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `InvoiceLine_invoiceId_idx` (`invoiceId`),
  CONSTRAINT `InvoiceLine_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoice` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoiceline`
--

LOCK TABLES `invoiceline` WRITE;
/*!40000 ALTER TABLE `invoiceline` DISABLE KEYS */;
/*!40000 ALTER TABLE `invoiceline` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `material`
--

DROP TABLE IF EXISTS `material`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pcs',
  `minLevel` decimal(14,3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Material_code_key` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `material`
--

LOCK TABLES `material` WRITE;
/*!40000 ALTER TABLE `material` DISABLE KEYS */;
/*!40000 ALTER TABLE `material` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `materiallot`
--

DROP TABLE IF EXISTS `materiallot`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `materiallot` (
  `id` int NOT NULL AUTO_INCREMENT,
  `materialId` int NOT NULL,
  `lotNumber` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(14,3) NOT NULL DEFAULT '0.000',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `MaterialLot_materialId_lotNumber_key` (`materialId`,`lotNumber`),
  CONSTRAINT `MaterialLot_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `material` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `materiallot`
--

LOCK TABLES `materiallot` WRITE;
/*!40000 ALTER TABLE `materiallot` DISABLE KEYS */;
/*!40000 ALTER TABLE `materiallot` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orderline`
--

DROP TABLE IF EXISTS `orderline`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orderline` (
  `id` int NOT NULL AUTO_INCREMENT,
  `orderId` int NOT NULL,
  `productId` int NOT NULL,
  `quantity` int NOT NULL,
  `unitPrice` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `OrderLine_orderId_idx` (`orderId`),
  KEY `OrderLine_productId_idx` (`productId`),
  CONSTRAINT `OrderLine_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `productionorder` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `OrderLine_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orderline`
--

LOCK TABLES `orderline` WRITE;
/*!40000 ALTER TABLE `orderline` DISABLE KEYS */;
/*!40000 ALTER TABLE `orderline` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orderprocess`
--

DROP TABLE IF EXISTS `orderprocess`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orderprocess` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lineId` int NOT NULL,
  `sequence` int NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `instructions` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Not Started',
  `completedQuantity` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `OrderProcess_lineId_idx` (`lineId`),
  CONSTRAINT `OrderProcess_lineId_fkey` FOREIGN KEY (`lineId`) REFERENCES `orderline` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orderprocess`
--

LOCK TABLES `orderprocess` WRITE;
/*!40000 ALTER TABLE `orderprocess` DISABLE KEYS */;
/*!40000 ALTER TABLE `orderprocess` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment`
--

DROP TABLE IF EXISTS `payment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoiceId` int NOT NULL,
  `paymentDate` date NOT NULL,
  `amount` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Payment_invoiceId_key` (`invoiceId`),
  CONSTRAINT `Payment_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoice` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment`
--

LOCK TABLES `payment` WRITE;
/*!40000 ALTER TABLE `payment` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product`
--

DROP TABLE IF EXISTS `product`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` int NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Product_code_key` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product`
--

LOCK TABLES `product` WRITE;
/*!40000 ALTER TABLE `product` DISABLE KEYS */;
/*!40000 ALTER TABLE `product` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `productbom`
--

DROP TABLE IF EXISTS `productbom`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `productbom` (
  `productId` int NOT NULL,
  `materialId` int NOT NULL,
  `quantity` decimal(14,3) NOT NULL,
  PRIMARY KEY (`productId`,`materialId`),
  KEY `ProductBom_materialId_idx` (`materialId`),
  CONSTRAINT `ProductBom_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `material` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ProductBom_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `productbom`
--

LOCK TABLES `productbom` WRITE;
/*!40000 ALTER TABLE `productbom` DISABLE KEYS */;
/*!40000 ALTER TABLE `productbom` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `productionorder`
--

DROP TABLE IF EXISTS `productionorder`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `productionorder` (
  `id` int NOT NULL AUTO_INCREMENT,
  `orderNumber` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `qtId` int NOT NULL,
  `customerId` int NOT NULL,
  `orderDate` date NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `startedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ProductionOrder_orderNumber_key` (`orderNumber`),
  KEY `ProductionOrder_qtId_idx` (`qtId`),
  KEY `ProductionOrder_customerId_idx` (`customerId`),
  CONSTRAINT `ProductionOrder_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customer` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ProductionOrder_qtId_fkey` FOREIGN KEY (`qtId`) REFERENCES `qtreference` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `productionorder`
--

LOCK TABLES `productionorder` WRITE;
/*!40000 ALTER TABLE `productionorder` DISABLE KEYS */;
/*!40000 ALTER TABLE `productionorder` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `progressentry`
--

DROP TABLE IF EXISTS `progressentry`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `progressentry` (
  `id` int NOT NULL AUTO_INCREMENT,
  `processId` int NOT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `completedQuantity` int NOT NULL,
  `workDate` date NOT NULL,
  `note` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` int NOT NULL,
  `at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ProgressEntry_processId_idx` (`processId`),
  KEY `ProgressEntry_userId_idx` (`userId`),
  CONSTRAINT `ProgressEntry_processId_fkey` FOREIGN KEY (`processId`) REFERENCES `orderprocess` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ProgressEntry_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `progressentry`
--

LOCK TABLES `progressentry` WRITE;
/*!40000 ALTER TABLE `progressentry` DISABLE KEYS */;
/*!40000 ALTER TABLE `progressentry` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchaseorder`
--

DROP TABLE IF EXISTS `purchaseorder`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchaseorder` (
  `id` int NOT NULL AUTO_INCREMENT,
  `poNumber` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplierId` int NOT NULL,
  `department` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `requiredDate` date NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Draft',
  `total` int NOT NULL DEFAULT '0',
  `receivedAt` datetime(3) DEFAULT NULL,
  `createdBy` int NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `PurchaseOrder_poNumber_key` (`poNumber`),
  KEY `PurchaseOrder_supplierId_idx` (`supplierId`),
  KEY `PurchaseOrder_createdBy_idx` (`createdBy`),
  CONSTRAINT `PurchaseOrder_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `PurchaseOrder_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `supplier` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchaseorder`
--

LOCK TABLES `purchaseorder` WRITE;
/*!40000 ALTER TABLE `purchaseorder` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchaseorder` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchaseorderline`
--

DROP TABLE IF EXISTS `purchaseorderline`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchaseorderline` (
  `id` int NOT NULL AUTO_INCREMENT,
  `poId` int NOT NULL,
  `materialId` int NOT NULL,
  `quantity` decimal(14,3) NOT NULL,
  `unit` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unitPrice` int NOT NULL,
  `amount` int NOT NULL,
  `lotNumber` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `PurchaseOrderLine_poId_idx` (`poId`),
  KEY `PurchaseOrderLine_materialId_idx` (`materialId`),
  CONSTRAINT `PurchaseOrderLine_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `material` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `PurchaseOrderLine_poId_fkey` FOREIGN KEY (`poId`) REFERENCES `purchaseorder` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchaseorderline`
--

LOCK TABLES `purchaseorderline` WRITE;
/*!40000 ALTER TABLE `purchaseorderline` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchaseorderline` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchasepayment`
--

DROP TABLE IF EXISTS `purchasepayment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchasepayment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `poId` int NOT NULL,
  `paymentDate` date NOT NULL,
  `amount` int NOT NULL,
  `method` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `referenceNo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `note` text COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `PurchasePayment_poId_key` (`poId`),
  CONSTRAINT `PurchasePayment_poId_fkey` FOREIGN KEY (`poId`) REFERENCES `purchaseorder` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchasepayment`
--

LOCK TABLES `purchasepayment` WRITE;
/*!40000 ALTER TABLE `purchasepayment` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchasepayment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `qtline`
--

DROP TABLE IF EXISTS `qtline`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qtline` (
  `id` int NOT NULL AUTO_INCREMENT,
  `qtId` int NOT NULL,
  `productId` int NOT NULL,
  `quantity` int NOT NULL,
  `unitPrice` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `QtLine_qtId_productId_key` (`qtId`,`productId`),
  KEY `QtLine_productId_idx` (`productId`),
  CONSTRAINT `QtLine_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `QtLine_qtId_fkey` FOREIGN KEY (`qtId`) REFERENCES `qtreference` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `qtline`
--

LOCK TABLES `qtline` WRITE;
/*!40000 ALTER TABLE `qtline` DISABLE KEYS */;
/*!40000 ALTER TABLE `qtline` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `qtreference`
--

DROP TABLE IF EXISTS `qtreference`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qtreference` (
  `id` int NOT NULL AUTO_INCREMENT,
  `qtNumber` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `qtDate` date NOT NULL,
  `customerId` int NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `customerPoNumber` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `customerPoDate` date DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Draft',
  `productionOrderId` int DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `QtReference_qtNumber_key` (`qtNumber`),
  UNIQUE KEY `QtReference_productionOrderId_key` (`productionOrderId`),
  KEY `QtReference_customerId_idx` (`customerId`),
  CONSTRAINT `QtReference_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customer` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `QtReference_productionOrderId_fkey` FOREIGN KEY (`productionOrderId`) REFERENCES `productionorder` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `qtreference`
--

LOCK TABLES `qtreference` WRITE;
/*!40000 ALTER TABLE `qtreference` DISABLE KEYS */;
/*!40000 ALTER TABLE `qtreference` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `receipt`
--

DROP TABLE IF EXISTS `receipt`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `receipt` (
  `id` int NOT NULL AUTO_INCREMENT,
  `receiptNumber` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoiceId` int NOT NULL,
  `receiptDate` date NOT NULL,
  `customerName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customerAddress` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Receipt_receiptNumber_key` (`receiptNumber`),
  UNIQUE KEY `Receipt_invoiceId_key` (`invoiceId`),
  CONSTRAINT `Receipt_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoice` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `receipt`
--

LOCK TABLES `receipt` WRITE;
/*!40000 ALTER TABLE `receipt` DISABLE KEYS */;
/*!40000 ALTER TABLE `receipt` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stockchange`
--

DROP TABLE IF EXISTS `stockchange`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stockchange` (
  `id` int NOT NULL AUTO_INCREMENT,
  `materialId` int NOT NULL,
  `lotNumber` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kind` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `change` decimal(14,3) NOT NULL,
  `balance` decimal(14,3) NOT NULL,
  `changeDate` date NOT NULL,
  `note` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `initial` tinyint(1) NOT NULL DEFAULT '0',
  `orderId` int DEFAULT NULL,
  `purchaseOrderId` int DEFAULT NULL,
  `userId` int NOT NULL,
  `at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `StockChange_materialId_idx` (`materialId`),
  KEY `StockChange_orderId_idx` (`orderId`),
  KEY `StockChange_purchaseOrderId_idx` (`purchaseOrderId`),
  KEY `StockChange_userId_idx` (`userId`),
  CONSTRAINT `StockChange_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `material` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `StockChange_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `productionorder` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `StockChange_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchaseorder` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `StockChange_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stockchange`
--

LOCK TABLES `stockchange` WRITE;
/*!40000 ALTER TABLE `stockchange` DISABLE KEYS */;
/*!40000 ALTER TABLE `stockchange` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier`
--

DROP TABLE IF EXISTS `supplier`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `address` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Supplier_code_key` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier`
--

LOCK TABLES `supplier` WRITE;
/*!40000 ALTER TABLE `supplier` DISABLE KEYS */;
/*!40000 ALTER TABLE `supplier` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suppliermaterial`
--

DROP TABLE IF EXISTS `suppliermaterial`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suppliermaterial` (
  `supplierId` int NOT NULL,
  `materialId` int NOT NULL,
  `unitPrice` int NOT NULL,
  PRIMARY KEY (`supplierId`,`materialId`),
  KEY `SupplierMaterial_materialId_idx` (`materialId`),
  CONSTRAINT `SupplierMaterial_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `material` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `SupplierMaterial_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `supplier` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppliermaterial`
--

LOCK TABLES `suppliermaterial` WRITE;
/*!40000 ALTER TABLE `suppliermaterial` DISABLE KEYS */;
/*!40000 ALTER TABLE `suppliermaterial` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `department` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Administration',
  `lastLoginAt` datetime(3) DEFAULT NULL,
  `passwordHash` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Worker',
  `tokenVersion` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_email_key` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES (1,'Admin','admin@gmail.com','2026-10-19 03:33:36.541','2026-10-19 03:34:26.550','Administration','2026-10-19 03:34:26.549','$2b$10$sB09wTW1m4VBOjYGnVfoieCk1TkIyRM6azle1w/23lZT4OlFi17WK','Admin',0),(2,'Factory Worker','worker@gmail.com','2026-10-19 03:33:36.622','2026-10-19 03:33:36.622','Factory',NULL,'$2b$10$ASGEzeI/DmpMHXxbH2VXv.ZnBIGovli2lUb428b6S8r8egHUBAXky','Worker',0),(3,'Sale Worker','sale@gmail.com','2026-10-19 03:33:36.705','2026-10-19 03:33:36.705','Sales',NULL,'$2b$10$mEUT.3c63MLYaOLMZEPSN.QK6SSvGBmd2ojgFH/pZdOvdPkoj/Chq','Worker',0);
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'kanou_mini_erp'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-19 10:53:11
