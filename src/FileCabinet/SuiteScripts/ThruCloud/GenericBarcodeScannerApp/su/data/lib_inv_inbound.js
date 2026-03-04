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
                    0 as quantity,
                    transactionline.quantity - transactionline.quantityshiprecv  as max_quantity,
                FROM transaction
                JOIN transactionline
                    ON transaction.id = transactionline.transaction
                WHERE transaction.type = 'PurchOrd'
                AND transaction.custbody_tc_barcode_ean_13  = '${options.barcode}'
                AND transactionline.mainline = 'F'
                AND transactionline.quantity > transactionline.quantityshiprecv`
            const arrItemReceiptResult = query.runSuiteQL({ query: strItemReceiptQuery }).asMappedResults()

            log.debug('arrItemReceiptResult', arrItemReceiptResult)

            const strQuery = `SELECT
                    item.id,
                    item.itemid,
                    item.custitem_tc_barcode_ean_13 as barcode,
                FROM item
                WHERE
                    item.custitem_tc_barcode_ean_13 = '${options.barcode}'`
            const arrItemResult = query.runSuiteQL({ query: strQuery }).asMappedResults()
            log.debug('arrItemResult', arrItemResult)

            if (!!arrItemReceiptResult.length) {
                objOutput.id = arrItemReceiptResult[0].id
                objOutput.name = arrItemReceiptResult[0].transaction_name
                objOutput.items = arrItemReceiptResult
                objOutput.type = "itemReceipt"
                objOutput.quantity = 1
            } else if (!!arrItemResult.length) {
                objOutput.item = arrItemResult[0]
                objOutput.type = "item"
            }
            log.debug('objOutput', objOutput)
            return objOutput
        }

        PUBLIC.confirmInbound = (options) => {
            try {
                const objOutput = {
                    data: {}
                }
                log.debug('confirmInbound | data', options)

                const strQuery = `SELECT 
                    transaction.id 
                FROM 
                    transaction
                WHERE 
                    transaction.custbody_tc_barcode_ean_13 = '${options.barcode}'
                AND transaction.type = 'PurchOrd'`
                const objPurchaseOrderResult = query.runSuiteQL({ query: strQuery }).asMappedResults()[0]
                log.debug('objPurchaseOrderResult', objPurchaseOrderResult)

                const objItemReceiptRec = record.transform({
                    fromType: record.Type.PURCHASE_ORDER,
                    fromId: objPurchaseOrderResult.id,
                    toType: record.Type.ITEM_RECEIPT,
                    isDynamic: true,
                })
                const intLineItem = objItemReceiptRec.getLineCount({ sublistId: 'item' })
                log.debug('intLineItem', intLineItem)
                for (const element of options.items[0].items) {
                    log.debug('element', element)
                    const intLinePOItem = objItemReceiptRec.findSublistLineWithValue({ sublistId: 'item', fieldId: 'item', value: element.itemid })
                    log.debug('intLinePOItem', intLinePOItem)
                    objItemReceiptRec.selectLine({ sublistId: 'item', line: intLinePOItem })
                    objItemReceiptRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: element.quantity })
                    objItemReceiptRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: options.location })
                    objItemReceiptRec.commitLine({ sublistId: 'item', line: intLinePOItem })
                }
                objItemReceiptRec.setValue('custbody_tc_barcode_ean_13', options.barcode)
                objOutput.data.itemReceiptId = objItemReceiptRec.save()
                objOutput.barcode = options.barcode
                log.debug('objOutput', objOutput)
                return objOutput
            } catch (e) {
                log.error('confirmInbound | Error', e)
            }

        }
        return PUBLIC

    });

