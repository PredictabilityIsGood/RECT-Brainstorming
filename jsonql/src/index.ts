import express from 'express';
const grul = require("grul");
const app = express();
const port = 3000;

let testData : { [source:string] : any[] } = { 
  "User":[{
    "id":1,
    "name":"Ryan Montgomery",
    "created":"2020-08-02"
  },{
    "source":"User",
    "id":2,
    "name":"Jane Doe",
    "created":"2020-08-05"
  }],
  "Transaction":[{
    "id":1,
    "userid":1,
    "item":"Ticket",
    "price":10,
    "paid":true
  },{
    "id":2,
    "userid":1,
    "item":"Burger",
    "price":2.50,
    "paid":true
  },{
    "id":3,
    "userid":2,
    "item":"Ticket",
    "price":10,
    "paid":true
  },{
    "id":4,
    "userid":2,
    "item":"Cola",
    "price":2.50,
    "paid":true
  }],
  "Favorite":[{
    "id":1,
    "userid":1,
    "CauseID":1
  },{
    "id":2,
    "userid":2,
    "CauseID":3
  }]
};

let cfg : any  = { 
	"@query":{
		"@prefix":"SELECT ",
		"@suffix":"",
    	"@select":{
			"@escape":{
				"@prefix":"[",
				"@suffix":"]"
			},
		},
		"@source":{
			"@escape":{
				"@prefix":"[",
				"@suffix":"]"
			}
		},
		"@where":{
			"@prefix":"WHERE ",
			"@suffix":""
		}
	},
	"@condition":{
		"@escape":{
			"@prefix":"[",
			"@suffix":"]"
		},
		"@operator":{
			"=":"{{{@key}}}{{{@operator}}}{{{@value}}}",
			">":"{{{@key}}}{{{@operator}}}{{{@value}}}",
			"<":"{{{@key}}}{{{@operator}}}{{{@value}}}",
			">=":"{{{@key}}}{{{@operator}}}{{{@value}}}",
			"<=":"{{{@key}}}{{{@operator}}}{{{@value}}}",
			"in":"{{{@key}}} {{{@operator}}} {{{@value}}}",
			"not in":"{{{@key}}} {{{@operator}}} {{{@value}}}",
			"between":"{{{@key}}} {{{@operator}}} {{{@value}}}",
		}
	},
	"@conjunction":{
		"@mode":{
			"or":" OR ",
			"and":" AND ",
			"union":" UNION ",
			"intersect":" INTERSECT "
		},
		"@prefix":"(",
		"@suffix":")"
	},
	"@interpreter":{
		"@query":"{{{@select}}} {{{@source}}} {{{@where}}}",
		"@conjunction":"{{{@conjunction}}}"
	},
	"@parameter":"@"
}

function join(parent:string,child:string,parentKey:string,childKey:string){
  let joined : any[] = [];
  let parentKeys = Object.keys(testData[parent][0]);
  let childKeys = Object.keys(testData[child][0]);
  let dup : {[source:string] : any }= {};
  parentKeys.forEach((key:string)=>{
    if(childKeys.indexOf(key) > -1 ){
      dup[key] = true;
    } 
  })
  testData[parent].forEach((prow)=>{
    testData[child].forEach((crow)=>{
      if(prow[parentKey] === crow[childKey]){
        let nrow : {[col:string]:any} = {};
        parentKeys.forEach((col)=>{
          nrow[col in dup ? parent+"."+col : col] = prow[col];
        })
        childKeys.forEach((col)=>{
          nrow[col in dup ? child+"."+col : col] = crow[col]
        })
        joined.push(nrow);
      }
    });
  });
  return joined;
}

app.get('/', (req:express.Request, res:express.Response) => {
  res.send('Welcome')
})
app.get('/query/*', (req:express.Request, res:express.Response) => {
  //let url:string = req.url;
  let query:any = req.query.q ? JSON.parse(req.query.q.toString()) : {};
  let isKey=(input:any)=>{
    if(!RegExp('^[a-zA-Z_][a-zA-Z0-9_]*$').test(input)){
      throw("invalid key");
    }
  };
  let boundCount:number = 0;
  let boundParameters:any = {

  };
  //generate query to pull data
  let code:string = cfg["@"+query["@type"].toString()]["@model"];
  let codeDynamic:string = cfg["@"+query["@type"].toString()]["@model"];
  grul.atPattern(query,["@type"],{
    "head":(discoverable:any,htp:any[],hlp:any[])=>{
      let objPath = hlp.slice(0,-1); //root path of query,conjunction,condition
      if(discoverable["@type"]==="query"){ //interpret level as query template
        //key for table
        isKey(discoverable["@source"]);
        code = code.replace(
          `{{{${objPath.concat(["@select"]).join("<===>")}}}}`,
          `${objPath.filter((key)=>{return key==="@select"}).length===0 ? cfg["@query"]["@prefix"] : ``}${discoverable["@select"].map((reference:any,index:number)=>{
            if(reference.constructor===Object){
              if(reference["@type"] === "query" ){
                return `{{{${objPath.concat(["@select",index,"@select"]).join("<===>")}}}}`;
              }
              else if(reference["@type"] === "conjunction"){
                return `{{{${objPath.concat(["@select",index,"@conjunction"]).join("<===>")}}}}`;
              }
              else{
                return `'Unrecognized Format' as Column${index}`;
              }
            }
            else if(reference.constructor===String || reference.constructor===Number ){
              isKey(reference); //key for column
              return `${cfg["@query"]["@source"]["@escape"]["@prefix"]}${discoverable["@source"]}${cfg["@query"]["@source"]["@escape"]["@suffix"]}.${cfg["@query"]["@select"]["@escape"]["@prefix"]}${reference}${cfg["@query"]["@select"]["@escape"]["@suffix"]}`;
            }
            else{
              return `'Unrecognized Format' as Column${index}`;
            }
          }).join(",")}`
        );
        code = code.replace(
          `{{{${objPath.concat(["@source"]).join("<===>")}}}}`,
          ` ${objPath.filter((key)=>{return key==="@select"}).length===0 ? "FROM" : "JOIN"} ${cfg["@query"]["@source"]["@escape"]["@prefix"]}${discoverable["@source"]}${cfg["@query"]["@source"]["@escape"]["@suffix"]}${discoverable["@select"].map((reference:any,index:number)=>{
            if(reference.constructor===Object){
              return ` {{{${objPath.concat(["@select",index,"@source"]).join("<===>")}}}} ON ${discoverable["@pk"].map((aKey:string,index:number)=>{return `${cfg["@query"]["@source"]["@escape"]["@prefix"]}${discoverable["@source"]}${cfg["@query"]["@source"]["@escape"]["@suffix"]}.${cfg["@query"]["@select"]["@escape"]["@prefix"]}${aKey}${cfg["@query"]["@select"]["@escape"]["@suffix"]}=${cfg["@query"]["@source"]["@escape"]["@prefix"]}${reference["@source"]}${cfg["@query"]["@source"]["@escape"]["@suffix"]}.${cfg["@query"]["@select"]["@escape"]["@prefix"]}${reference["@select"][index]}${cfg["@query"]["@select"]["@escape"]["@suffix"]}`}).join(" AND ")}`;
            }
            return ``;
          }).join(``)}${cfg["@query"]["@suffix"]}`
        );
        code = code.replace(
          `{{{${objPath.concat(["@where"]).join("<===>")}}}}`,
          `${cfg["@query"]["@where"]["@prefix"]}${discoverable["@where"].map((reference:any,index:number)=>{
              if(reference["@type"]==="conjunction"){
                return `{{{${objPath.concat(["@where",index,"@conjunction"]).join("<===>")}}}}`;
              }
              else if(reference["@type"]==="condition"){
                return `{{{${objPath.concat(["@where",index,"@condition"]).join("<===>")}}}}`
              }
              return ``;
          }).join(" AND ")}${cfg["@query"]["@where"]["@suffix"]}`
        )
      }
      else if(discoverable["@type"]==="condition"){ //interpret level as condition template
        //place condition, proxy id,value to children elements nesting clause
        let model = cfg["@"+discoverable["@type"]];
        let opTemplate = cfg["@condition"][model][discoverable[model]] || "0=1";
        let opFill = discoverable;
        let opCode = opTemplate+""; //Final OpCode
        isKey(opFill["@key"]);
        opCode = opCode.replace("{{{@key}}}",`${cfg["@query"]["@select"]["@escape"]["@prefix"]}${opFill["@key"]}${cfg["@query"]["@select"]["@escape"]["@suffix"]}`);
        opCode = opCode.replace("{{{@operator}}}",opFill["@operator"]);
        let rawValue = opFill["@value"];
        if(rawValue.constructor === Object ){ //construct area to inject pattern search
          if(rawValue["@type"] === "query" ){
            opCode = opCode.replace(`{{{@value}}}`,`{{{@${objPath.concat(["@select"]).join("<===>")}}}}`);
          }
          else if(rawValue["@type"] === "conjunction"){
            opCode = opCode.replace(`{{{@value}}}`,`{{{@${objPath.concat(["@conjunction"]).join("<===>")}}}}`)
          }
        }
        else if(rawValue.constructor === Array){ //construct bound parameters passed through orm
          let boundParameterNames = rawValue.map((aValue)=>{
            boundCount++;
            let paramName = `Param${boundCount}`;
            boundParameters[`Param${boundCount}`] = aValue; //let orm handle
            return cfg["@parameter"]+paramName;
          });
          opCode = opCode.replace("{{{@value}}}",`(${boundParameterNames.join(",")})`);
        }
        else if(rawValue.constructor === String || rawValue.constructor === Number){ //construct bound parameter passed through orm
          boundCount++;
          let paramName = `Param${boundCount}`;
          boundParameters[`Param${boundCount}`] = rawValue; //let orm handle
          opCode = opCode.replace("{{{@value}}}",cfg["@parameter"]+paramName)
        }
        code = code.replace(
          `{{{${objPath.concat(["@condition"]).join("<===>")}}}}`,
          opCode
        );
      }
      else if(discoverable["@type"]==="conjunction"){ //interpret level as conjunction template
        //proxy id,value to children elements nesting clause
        let model = cfg["@"+discoverable["@type"]];
        let literalKeys = [];
        let referenceKeys = [];

        


        let nestedTemplates = `${cfg["@conjunction"]["@prefix"]}${discoverable["@children"].map((reference:any,index:number)=>{
          return `{{{${objPath.concat(["@children",index,"@"+reference["@type"]]).join("<===>")}}}}`;
        }).join(cfg["@conjunction"]["@mode"][discoverable["@mode"]])}${cfg["@conjunction"]["@suffix"]}`
        code = code.replace(
          `{{{${objPath.concat(["@conjunction"]).join("<===>")}}}}`,
          `${cfg["@conjunction"]["@prefix"]}${nestedTemplates}${cfg["@conjunction"]["@suffix"]}`
        );
      }
    }
  },-1);
  
  
  
  
  testData["UserTransaction"] = join("User","Transaction","id","userid");
  let totalList : any[] = join("UserTransaction","Favorite","User.id","userid");

  //group data pulled from query
  let hierarchyTemplate : any[] = []; //dynamically constructed hierarchy template
  let hierarchicalParentMap : { [source:string] : any } = {}; //parent map for attachment

  grul.atPattern(query,["@select"],{"head":(level:any,htp:any[],hlp:any[])=>{
    let hierarchyLevel : any = {};
    //generate hierarchy level template
    level["@select"].forEach((column:any,index:number)=>{
      if(column.constructor === String){
        hierarchyLevel[column.toString()] = { 
          "head":(row:any,htp:any[],hlp:any[])=>{
            return (level["@source"]+"."+column.toString()) in row ? row[level["@source"]+"."+column.toString()]  : row[column.toString()];
          }
        }
      }
      else if(column.constructor === Object){
        let nlp = hlp.concat([index,"@select"])
        hierarchyLevel[column["@source"].toString()] = [];
        hierarchicalParentMap[nlp.join("<===>")] = hierarchyLevel[column["@source"].toString()];
      }
    });
    //attach to parent or root
    if(hlp.length==1){
      hierarchyTemplate.push(hierarchyLevel);
    }
    else{
      hierarchicalParentMap[hlp.join("<===>")].push(hierarchyLevel);
    }
  }},-1);
  
  let results : any[] = grul.atHierarchy(totalList,hierarchyTemplate);

  res.send({
    "query":query,
    "hierarchy":hierarchyTemplate,
    "results":results
  });
})
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})