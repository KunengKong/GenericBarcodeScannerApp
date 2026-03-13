/**
 * @NApiVersion 2.1
 */
define(['N/query', 'N/record'],
    /**
 * @param{query} query
 */
    (query, record) => {

        const PUBLIC = {}
        PUBLIC.inboundItemRecieptLookUp = (options) => {
            log.debug('inboundItemRecieptLookUp', options)
            const objOutput = {}

            const strItemReceiptQuery = `SELECT
                    transaction.id,
                    BUILTIN.DF(transaction.id) as transaction_name,
                    transaction.custbody_tc_barcode_ean_13 as barcode,
                    transactionline.item as itemid,
                    BUILTIN.DF(transactionline.item) as itemname,
                    BUILTIN.DF(transactionline.units) as uomname,
                    0 as quantity,
                    transactionline.quantity as quantityinitialized,
                    transactionline.quantity - transactionline.quantityshiprecv  as max_quantity,
                    transactionline.quantityshiprecv as quantityreceived,
                    transactionline.location,
                    transaction.type as transactiontype,
                    transactionline.subsidiary
                FROM transaction
                JOIN transactionline
                    ON transaction.id = transactionline.transaction
                WHERE transaction.type = '${options.step == 'inFromSupplier' ? 'PurchOrd' : 'TrnfrOrd'}'
                AND transaction.custbody_tc_barcode_ean_13  = '${options.barcode}'
                AND transactionline.mainline = 'F'
                AND transactionline.quantity > 0`
            const arrItemReceiptResult = query.runSuiteQL({ query: strItemReceiptQuery }).asMappedResults()
            log.debug('arrItemReceiptResult', arrItemReceiptResult)

            const strSubsidiariesLocationQuery = `SELECT
                location.id as location,
                BUILTIN.DF(location.id) as name
                FROM location 
                JOIN LocationSubsidiaryMap
                    ON LocationSubsidiaryMap.location = location.id
                    AND LocationSubsidiaryMap.subsidiary = ${arrItemReceiptResult[0].subsidiary}
                AND location.isinactive = 'F'`
            log.debug('strSubsidiariesLocationQuery', strSubsidiariesLocationQuery)
            const arrSubsidiariesLocationResult = query.runSuiteQL({ query: strSubsidiariesLocationQuery }).asMappedResults()

            for (const [key, _] of arrItemReceiptResult.entries()) {
                arrItemReceiptResult[key].itemPerLocation = arrSubsidiariesLocationResult
            }
            if (!!arrItemReceiptResult.length) {
                objOutput.id = arrItemReceiptResult[0].id
                objOutput.location = arrItemReceiptResult[0].location
                objOutput.name = arrItemReceiptResult[0].transaction_name
                objOutput.transactiontype = arrItemReceiptResult[0].transactiontype
                objOutput.items = arrItemReceiptResult
                objOutput.type = "itemReceipt"
                objOutput.quantity = 1
            } else if (!arrItemReceiptResult.length) {
                const strQuery = `SELECT
                    item.id,
                        item.itemid,
                        item.custitem_tc_barcode_ean_13 as barcode,
                    FROM item
                    WHERE
                        item.custitem_tc_barcode_ean_13 = '${options.barcode}'`
                const arrItemResult = query.runSuiteQL({ query: strQuery }).asMappedResults()
                log.debug('arrItemResult', arrItemResult)
                objOutput.item = arrItemResult[0]
                objOutput.type = "item"
            }
            log.debug('objOutput', objOutput)
            return objOutput
        }

        PUBLIC.confirmInbound = (options) => {
            try {
                const objOutput = {
                    data: {},
                    step: options.step
                }
                log.debug('confirmInbound | data', options)

                const strQuery = `SELECT 
                    transaction.id 
                FROM 
                    transaction
                WHERE 
                    transaction.custbody_tc_barcode_ean_13 = '${options.barcode}'
                AND transaction.type = '${options.step == 'inFromSupplier' ? 'PurchOrd' : 'TrnfrOrd'}'`
                const objPurchaseOrderResult = query.runSuiteQL({ query: strQuery }).asMappedResults()[0]
                log.debug('objPurchaseOrderResult', objPurchaseOrderResult)

                const objItemReceiptRec = record.transform({
                    fromType: options.step == 'inFromSupplier' ? record.Type.PURCHASE_ORDER : record.Type.INTER_COMPANY_TRANSFER_ORDER,
                    fromId: objPurchaseOrderResult.id,
                    toType: record.Type.ITEM_RECEIPT,
                    isDynamic: true,
                })
                const intLineItem = objItemReceiptRec.getLineCount({ sublistId: 'item' })
                for (let i = 0; i < intLineItem; i++) {
                    objItemReceiptRec.selectLine({ sublistId: 'item', line: i })
                    objItemReceiptRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: false })
                    objItemReceiptRec.commitLine({ sublistId: 'item', line: i })
                }
                for (const element of options.items[0].items) {
                    if (!element.quantity) continue
                    log.debug('element', element)
                    const intLinePOItem = objItemReceiptRec.findSublistLineWithValue({ sublistId: 'item', fieldId: 'item', value: element.itemid })
                    objItemReceiptRec.selectLine({ sublistId: 'item', line: intLinePOItem })
                    objItemReceiptRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: true })
                    if (options.step != 'inFromBranch')
                        objItemReceiptRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: element.location })
                    objItemReceiptRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: element.quantity })

                    // const strItem = objItemReceiptRec.getCurrentSublistText({ sublistId: 'item', fieldId: 'item' })
                    // log.debug('intItem', intItem)
                    // if (options.step == 'inFromBranch') {
                    //     // ===== INVENTORY DETAIL =====
                    //     const invDetail = objItemReceiptRec.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail' })
                    //     const intInvDetailQty = invDetail.getValue({ fieldId: 'quantity' })
                    //     log.debug('intInvDetailQty', intInvDetailQty)
                    //     invDetail.selectLine({ sublistId: 'inventoryassignment', line: 0 })
                    //     invDetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'inventorystatus', value: 1, line: 0 })
                    //     invDetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: intInvDetailQty, line: 0 })
                    //     invDetail.commitLine({ sublistId: 'inventoryassignment', line: 0 })
                    // }

                    objItemReceiptRec.commitLine({ sublistId: 'item', line: intLinePOItem })
                }
                objItemReceiptRec.setValue('custbody_tc_barcode_ean_13', options.barcode)
                objOutput.data.itemReceiptId = objItemReceiptRec.save()
                objOutput.barcode = options.barcode
                log.debug('objOutput', objOutput)
                return objOutput
            } catch (e) {
                log.error('confirmInbound | Error', e)
                return e
            }

        }
        return PUBLIC

    });

