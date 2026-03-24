/**
 * @NApiVersion 2.1
 */
define(['N/query', 'N/record'],
    /**
 * @param{query} query
 * @param{record} record
 */
    (query, record) => {

        const PUBLIC = {}
        PUBLIC.outboundItemRecieptLookUp = (options) => {
            log.debug('outboundItemRecieptLookUp', options)
            const objOutput = {}
            objOutput.isCustomer = options.step == 'outforcustomer'
            const strItemReceiptQuery = `SELECT
                    transaction.id,
                    BUILTIN.DF(transaction.id) as transaction_name,
                    transaction.custbody_tc_ims_barcode as barcode,
                    transactionline.item as itemid,
                    BUILTIN.DF(transactionline.item) as itemname,
                    0 as quantity,
                    ABS(transactionline.quantity) as quantityinitialized,
                    transactionline.quantityshiprecv,
                    transactionline.quantitypacked,
                    transactionline.quantitypicked,
                    ABS(transactionline.quantity) - ABS(transactionline.quantitypicked) as max_quantity,
                    transactionline.location as fromlocation,
                    transaction.transferlocation as tolocation,
                    BUILTIN.DF(transactionline.units) as uomname,
                    transactionline.location as location,
                    transactionline.subsidiary
                FROM transaction
                JOIN transactionline
                    ON transaction.id = transactionline.transaction
                WHERE 
                    transaction.type = '${objOutput.isCustomer ? 'SalesOrd' : 'TrnfrOrd'}'
                    AND transaction.custbody_tc_ims_barcode  = '${options.barcode}'
                    AND transactionline.mainline = 'F'
                    AND transactionline.item > 0
                ${objOutput.isCustomer ? '' : "AND transactionline.hasfulfillableitems = 'T'"}`
            log.debug('strItemReceiptQuery', strItemReceiptQuery)

            const arrItemReceiptResult = query.runSuiteQL({ query: strItemReceiptQuery }).asMappedResults()
            log.debug('arrItemReceiptResult', arrItemReceiptResult)


            const strSubsidiariesLocationQuery = `SELECT
                    location.id as location,
                    BUILTIN.DF(location.id) as name
                FROM location 
                JOIN LocationSubsidiaryMap
                    ON LocationSubsidiaryMap.location = location.id
                        AND LocationSubsidiaryMap.subsidiary = ${options.subsidiary}
                        AND location.isinactive = 'F'`
            const arrSubsidiariesLocationResult = query.runSuiteQL({ query: strSubsidiariesLocationQuery }).asMappedResults()

            for (const [key, _] of arrItemReceiptResult.entries()) {
                arrItemReceiptResult[key].itemPerLocation = arrSubsidiariesLocationResult
            }
            if (!!arrItemReceiptResult.length) {
                objOutput.id = arrItemReceiptResult[0].id
                objOutput.fromLocation = arrItemReceiptResult[0].fromlocation
                objOutput.toLocation = arrItemReceiptResult[0].tolocation
                objOutput.name = arrItemReceiptResult[0].transaction_name
                objOutput.items = arrItemReceiptResult
                objOutput.type = "itemReceipt"
                objOutput.quantity = 1
            } else if (!arrItemReceiptResult.length) {
                const strQuery = `SELECT
                        item.id,
                        item.itemid,
                        item.custitem_tc_ims_barcode as barcode,
                    FROM item
                    WHERE
                        item.custitem_tc_ims_barcode = '${options.barcode}'`
                const arrItemResult = query.runSuiteQL({ query: strQuery }).asMappedResults()
                log.debug('arrItemResult', arrItemResult)
                objOutput.item = arrItemResult[0]
                objOutput.type = "item"
            }
            log.debug('objOutput', objOutput)
            return objOutput
        }
        PUBLIC.processOutbound = (options) => {
            log.debug('processOutbound', options)
            const objOutput = { arrIFId: [] }
            try {
                const strSOQuery = `SELECT
                        transaction.id,
                        transaction.custbody_tc_ims_barcode as barcode
                    FROM transaction
                    WHERE
                            transaction.type = '${options.type == 'customer' ? 'SalesOrd' : 'TrnfrOrd'}'
                        AND transaction.custbody_tc_ims_barcode  = '${options.barcode}'`
                const objSOResult = query.runSuiteQL({ query: strSOQuery }).asMappedResults()[0]
                log.debug('objSOResult', objSOResult)

                const objGroupedItems = options.items[0].items.reduce((acc, item) => {
                    const loc = item.location
                    if (!acc[loc]) acc[loc] = []
                    acc[loc].push(item)
                    return acc
                }, {})
                log.debug('objGroupedItems', objGroupedItems)
                for (const locationKey in objGroupedItems) {
                    log.debug('objGroupedItems | obj', objGroupedItems[locationKey])
                    log.debug('objGroupedItems | objSOResult.id', objSOResult.id)
                    const objItemFullfilmentRec = record.transform({
                        fromType: options.type == 'customer' ? record.Type.SALES_ORDER : record.Type.INTER_COMPANY_TRANSFER_ORDER,
                        fromId: objSOResult.id,
                        toType: record.Type.ITEM_FULFILLMENT,
                        isDynamic: true,
                    })
                    objItemFullfilmentRec.setValue('custbody_tc_ims_barcode', null)
                    const intIFLineCount = objItemFullfilmentRec.getLineCount({ sublistId: 'item' })
                    log.debug('intIFLineCount', intIFLineCount)
                    for (let index = 0; index < intIFLineCount; index++) {
                        objItemFullfilmentRec.selectLine({ sublistId: 'item', line: index })
                        objItemFullfilmentRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: false })
                        objItemFullfilmentRec.commitLine({ sublistId: 'item', line: index })
                    }
                    for (const element of objGroupedItems[locationKey]) {
                        log.debug('element', element)
                        const intLinePOItem = objItemFullfilmentRec.findSublistLineWithValue({ sublistId: 'item', fieldId: 'item', value: element.itemid })
                        if (intLinePOItem < 0) continue
                        if (!element.quantity) continue
                        objItemFullfilmentRec.selectLine({ sublistId: 'item', line: intLinePOItem })
                        objItemFullfilmentRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: !!element.quantity })
                        objItemFullfilmentRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: element.quantity })
                        if (options.type == 'customer') {

                            let intLocation = objItemFullfilmentRec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'location' })
                            objItemFullfilmentRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: element.location })

                            if (intLocation != element.location) {
                                const invDetail = objItemFullfilmentRec.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail', line: intLinePOItem })
                                invDetail.selectLine({ sublistId: 'inventoryassignment', line: 0 })
                                invDetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'inventorystatus', value: 1, line: 0 })
                                invDetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: element.quantity, line: 0 })
                                invDetail.commitLine({ sublistId: 'inventoryassignment', line: 0 })
                            }
                        }
                        objItemFullfilmentRec.commitLine({ sublistId: 'item', line: intLinePOItem })
                    }
                    objOutput.arrIFId.push(objItemFullfilmentRec.save())
                }
                log.debug('objOutput', objOutput)
            } catch (e) {
                log.error('processOutbound', e)
            }
            log.debug('objOutput', objOutput)
            return objOutput
        }

        PUBLIC.outboundProcessIF = (options) => {
            log.debug('outboundProcessIF', options)
            const objOutput = {
                step: options.step
            }
            try {
                const strIFQuery = `SELECT
                        transaction.id,
                        transaction.custbody_tc_ims_barcode as barcode
                    FROM transaction
                    WHERE transaction.type = 'ItemShip'
                    AND transaction.custbody_tc_ims_barcode  = '${options.barcode}'`
                log.debug('objIFResult', strIFQuery)
                const objIFResult = query.runSuiteQL({ query: strIFQuery }).asMappedResults()[0]
                log.debug('objIFResult', objIFResult)
                if (options.step == 'pack')
                    objOutput.shipstatus = 'B'
                if (options.step == 'ship')
                    objOutput.shipstatus = 'C'

                objOutput.intIFId = record.submitFields({
                    type: record.Type.ITEM_FULFILLMENT,
                    id: objIFResult.id,
                    values: {
                        shipstatus: objOutput.shipstatus //B = Packed, C = Shipped
                    }
                })

            } catch (e) {
                log.error('outboundProcessIF', e)
            }
            log.debug('objOutput', objOutput)
            return objOutput
        }
        return PUBLIC
    });