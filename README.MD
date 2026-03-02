# Generic Barcode Scanner App

A ReactJS-based barcode scanning application deployed to NetSuite through a SuiteScript Suitelet.

## Overview

This application provides barcode scanning functionality integrated directly into NetSuite, enabling efficient inventory and transaction management.

## Prerequisites

- Node.js and npm
- NetSuite account with SuiteScript 2.1 enabled
- NetSuite SuiteCloud Development Framework

## Installation

1. Clone the repository
2. Install dependencies:
  ```bash
  npm install
  ```

## Deployment to NetSuite

1. Add the `deploy.xml` file to configure your Suitelet deployment
2. Use the NetSuite SDF Deployment functionality from VSCode 
3. Deploy the Suitelet through NetSuite's deployment interface or CLI