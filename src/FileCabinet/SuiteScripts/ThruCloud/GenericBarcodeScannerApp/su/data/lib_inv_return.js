/**
 * @NApiVersion 2.1
 */
define(['N/query', 'N/record'],
    /**
     * @param{query} query
     */
    (query, record) => {

        const PUBLIC = {}
        PUBLIC.returnItemRecieptLookUp = (options) => {
            log.debug('returnItemRecieptLookUp', options)
            const objOutput = {}

            const strRecordType = options.returnFrom == 'customer' ? 'SalesOrd' : 'PurchOrd'

            const strItemReceiptQuery = `SELECT
                    transaction.id,
                    BUILTIN.DF(transaction.id) as transaction_name,
                    transactionline.item as itemid,
                    BUILTIN.DF(transactionline.item) as itemname,
                    ABS(transactionline.quantity) as max_quantity,
                    quantity = 0,
                FROM transaction
                JOIN transactionline
                    ON transaction.id = transactionline.transaction
                WHERE transaction.type = '${strRecordType}'
                AND transactionline.custcol_tc_barcode_ean_13  = '${options.barcode}'
                AND transactionline.mainline = 'F'`
            const arrSOResult = query.runSuiteQL({ query: strItemReceiptQuery }).asMappedResults()
            log.debug('arrSOResult', arrSOResult)
            const strQuery = `SELECT
                    item.id,
                    item.itemid,
                    item.custitem_tc_barcode_ean_13 as barcode,
                FROM item
                WHERE
                    item.custitem_tc_barcode_ean_13 = '${options.barcode}'`
            const arrItemResult = query.runSuiteQL({ query: strQuery }).asMappedResults()
            log.debug('arrItemResult', arrItemResult)

            if (!!arrSOResult.length) {
                objOutput.id = arrSOResult[0].id
                objOutput.name = arrSOResult[0].transaction_name
                objOutput.items = arrSOResult
                objOutput.type = "salesOrder"
                objOutput.quantity = 1
            } else if (!!arrItemResult.length) {
                objOutput.quantity = 0
                objOutput.item = arrItemResult[0]
                objOutput.type = "item"
            }
            log.debug('objOutput', objOutput)
            return objOutput
        }
        PUBLIC.processReturnAuthorization = (options) => {
            const objOutput = {
                poIds: [],
                purchaseOrder: {
                    barcodes: [],
                    items: []
                }
            }
            log.debug('processReturnAuthorization', options)
            /** SAMPLE DATA
             * {
                items: [
                    {
                        id: 31173,
                        name: "Shipment Record #SO662",
                        items: [
                            {
                            id: 31173,
                            transaction_name: "Shipment Record #SO662",
                            itemid: 325,
                            itemname: "3X HD Video Conferencing Camera",
                            max_quantity: 5,
                            quantity: 3
                            }
                        ],
                        type: "salesOrder",
                        quantity: 1
                    }
                ],
                location: 100
                }
             */
            log.debug('options.items[0]', options.items[0])
            const isCustomerReturn = options.items[0].type == 'salesOrder'

            const objReturnAuthRecord = record.transform({
                fromType: isCustomerReturn ? record.Type.SALES_ORDER : record.Type.PURCHASE_ORDER,
                fromId: options.items[0].id,
                toType: record.Type.RETURN_AUTHORIZATION,
                isDynamic: true,
            })

            for (const [index, element] of options.items[0].items.entries()) {
                const intLineReturnItem = objReturnAuthRecord.findSublistLineWithValue({ sublistId: 'item', fieldId: 'item', value: element.itemid })
                objReturnAuthRecord.selectLine({ sublistId: 'item', line: intLineReturnItem })
                objReturnAuthRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: element.quantity })
                objOutput.purchaseOrder.barcodes.push(objReturnAuthRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_tc_barcode_ean_13' }))
                objOutput.purchaseOrder.items.push(element.itemid)
                objReturnAuthRecord.commitLine({ sublistId: 'item', line: intLineReturnItem })
            }

            objOutput.returnAuthId = objReturnAuthRecord.save()
            const objInboundReturnRec = record.transform({
                fromType: record.Type.RETURN_AUTHORIZATION,
                fromId: objOutput.returnAuthId,
                toType: isCustomerReturn ? record.Type.ITEM_RECEIPT : record.Type.ITEM_FULFILLMENT,
                isDynamic: true
            })
            objOutput.inboundReturnId = objInboundReturnRec.save()

            log.debug('objOutput ', objOutput)
            // if (isCustomerReturn) {
            //     const strPurchaseOrderQuery = `SELECT
            //         transaction.id,
            //     FROM transaction
            //     JOIN transactionline
            //         ON transaction.id = transactionline.transaction
            //         AND transactionline.item IN (${objOutput.purchaseOrder.items})
            //     WHERE transaction.custbody_tc_barcode_ean_13 IN (${objOutput.purchaseOrder.barcodes})
            //     AND transaction.type = 'PurchOrd'`
            //     const arrPOResult = query.runSuiteQL({ query: strPurchaseOrderQuery }).asMappedResults()
            //     log.debug('arrPOResult', arrPOResult)
            //     for (const poRec of arrPOResult) {

            //         const objPurchaseOrder = record.load({
            //             type: record.Type.PURCHASE_ORDER,
            //             id: poRec.id
            //         })

            //         for (const element of options.items[0].items) {
            //             if (isCustomerReturn) {
            //                 const intLinePOItem = objPurchaseOrder.findSublistLineWithValue({ sublistId: 'item', fieldId: 'item', value: element.itemid })
            //                 objPurchaseOrder.selectLine({ sublistId: 'item', line: intLinePOItem })
            //                 objPurchaseOrder.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_tc_ims_cust_return', value: element.quantity })
            //                 objPurchaseOrder.commitLine({ sublistId: 'item', line: intLinePOItem })
            //             }
            //         }
            //         objOutput.poIds.push(objPurchaseOrder.save())
            //     }

            // }
            log.debug('objOutput', objOutput)

            return objOutput
        }
        return PUBLIC

    });
