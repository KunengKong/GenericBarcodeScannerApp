/**
 * @NApiVersion 2.1
 */
define(['N/query', 'N/record'],
    /**
 * @param{query} query
 */
    (query, record) => {

        const PUBLIC = {}
        PUBLIC.confirmInbound = (options) => {
            try {
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

                objItemReceiptRec.setValue('custbody_tc_barcode_ean_13', options.barcode)
                const intItemReceiptId = objItemReceiptRec.save()
                log.debug(';intItemReceiptId', intItemReceiptId)
                return {
                    data: {
                        itemReceipt: intItemReceiptId,
                        barcode: options.barcode
                    }
                }
            } catch (e) {
                log.error('confirmInbound | Error', e)
            }

        }
        return PUBLIC

    });
