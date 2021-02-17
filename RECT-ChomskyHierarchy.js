/* Example Query Request
 */
{
	"@type":"query",
    "@source":"User",
    "@select":[
        "id",
        "name",
        "created",
        {
			"@type":"query",
            "@source":"Transaction",
            "@select":["id","item","price","paid"],
            "@pk":["id"],
            "@fk":["userid"],
            "@where":[]
        },
        {
			"@type":"query",
            "@source":"Favorite",
            "@select":["CauseID"],
            "@pk":["id"],
            "@fk":["userid"],
            "@where":[]
        }
    ],
    "@pk":["id"],
    "@where":[{
		"@type":"conjunction",
		"@children":[{
			"@type":"condition",
			"@key":"id",
			"@operator":"in",
			"@value":[1,2,3]
		},{
			"@type":"condition",
			"@key":"name",
			"@operator":"in",
			"@value":["Ryan Montgomery"]
		}],
		"@mode":"or"
	}]
}


/* Query
 */
{
	"@type":"Definition of the structure type - query"
	"@source":"Database Table/Data Set name",
	"@select":"Array of columns to include (supporting 'Query' type recursion)",
	"@pk":"Definition of the primary key column(s) supporting children hierarchy",
	"@fk":"Definition of the foreign key column(s) connecting parent hierarchy",
	"@where":"Array of conditions to run before return"
}

/* Condition
 */
{
	"@type":"Definition of the structure type - condition",
	"@key":"Defines column to conditionalize from current selection",
	"@operator":"Defines operator of condition",
	"@value":"Defines value for conditional operator to compare (supporting 'Query' type recursion)"
}

/* Conjunction
 */
{
	"@type":"Definition of the structure type - conjunction"
	"@children":"Definition of the condition id's utilized in conjunction wrapping",
	"@mode":"Definition for the type of conjunction to apply upon interpreting"
}

/* Configuration - defines configuration parameters for interpreter pipeline - Exmaple below is SQL Server
 */
{ 
	"@query":{
		"@model":"SELECT {{@select}} FROM {{@source}} WHERE {{@where}}",
    	"@select":{
			Array:"{{@select}}",
			Object:"{{{@select}}}",
			String:"[{@select}]"
		},
		"@source":function(object,hop,hlp,htp,root){
			
		},
		"@where":{
			Array:"{{@where}}",
			"query":"{{{@query}}}",
			"conditional":"{{{@conditional}}}",
			"conjunction":"{{{@conjunction}}}"
		}
	},
	"@condition":{
		"@model":"{{@operator}}",
		"@operator":{
			"=":"{{@key}}{@operator}{{@value}}",
			">":"{{@key}}{@operator}{{@value}}",
			"<":"{{@key}}{@operator}{{@value}}",
			">=":"{{@key}}{@operator}{{@value}}",
			"<=":"{{@key}}{@operator}{{@value}}",
			"in":"{{@key}} {@operator} {{@value}}",
			"not in":"{{@key}} {@operator} {{@value}}",
			"between":"{{@key}} {@operator} {{@value}}"
		},
		"@key":function(object,hop,hlp,htp,root){
			
		},
		"@value":{
			Array:"{{@value}}",
			Object:"",
			String:"'{value}'",
			Number:"{value}",
			Date:"{value}"
		}
	},
	"@conjunction":{
		"@model":"( {{@children}} )",
		"@mode":{
			"or":" OR ",
			"and":" AND ",
			"union":" UNION ",
			"intersect":" INTERSECT ",
			",":" , ",
		},
		"@children":{
			Array:"{{@children}}",
			"query":"{{{@query}}}",
			"conditional":"{{{@conditional}}}",
			"conjunction":"{{{@conjunction}}}"
		}
	},
	"@parameter":"@"
}


/*
	Transpiler

	Structure:

	1) Recursively Enumerable Configuration
		a) Context Filling
			Each context will execute in the order 4=>3=>2=>1=> WHERE 3,2,1 initiate recursive sub selection back to 3=>2=>1
			i) Context Literal 						'a literal' 	a => a
				This will literally return the final result
			ii) Input Context Reference				'{@Key}'		a => b
				This will retrieve a variable from the context of the input current traversed type
			iii) Configuration Context Reference 	'{{@Key}}' 		a => c
				This will retrieve a variable from the context of the grammar configuration from the perspective of the current traversed type
			iv) Configuration Escape Reference		'{{{@Key}}}'	a => d  
				This will retrieve a variable from the potential context of the grammar configuration from the perspective of the future traversed type
	2) Multi-Dimensional Tree Input
		a) Type direction
			Type describes enumeration based on level input type
	
*/