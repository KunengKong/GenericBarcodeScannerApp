/**
 * @NApiVersion 2.1
 */
define(['N/query'],
    /**
 * @param{query} query
 */
    (query) => {

        const PUBLIC = {}
        PUBLIC.uomandlocation = () => {

            const strQuery = `SELECT
                    unitsTypeUom.unitsType as id,
                    unitsTypeUom.unitname as name,
                FROM unitsTypeUom`
            const arrUomResult = query.runSuiteQL({ query: strQuery }).asMappedResults()

            const strLocationQuery = `SELECT
                    id as id,
                    BUILTIN.DF(id) as name,
                FROM location
                WHERE location.isinactive = 'F'`
            const arrLocationResult = query.runSuiteQL({ query: strLocationQuery }).asMappedResults()

            const strInvAdjReasonQuery = `SELECT
                id, name
                FROM customlist_tc_ims_reason_inv_adjust
                WHERE isinactive ='F'`
            const arrInvAdjReasonResult = query.runSuiteQL({ query: strInvAdjReasonQuery }).asMappedResults()

            return {
                uomSelect: arrUomResult,
                locationSelect: arrLocationResult,
                invAdjReason: arrInvAdjReasonResult
            }
        }
        return PUBLIC
    })