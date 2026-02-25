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
                FROM location`
            const arrLocationResult = query.runSuiteQL({ query: strLocationQuery }).asMappedResults()

            return {
                uomSelect: arrUomResult,
                locationSelect: arrLocationResult
            }
        }
        return PUBLIC
    })