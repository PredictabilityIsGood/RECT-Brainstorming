var RelationalThesaurus = [ 
    {
        "word":"time",
        "options":["years","months","weeks","days","hours","minutes","seconds","milliseconds"],
    },
    {
        "word":"millenium",
        "options":"constructed",
        "measurement-eval":"1000 * `years`",
        "measurement-type":"epoch"
    },
    {
        "word":"years",
        "options":"constructed",
        "measurement-eval":"31536000000 * `milliseconds`",
        "measurement-type":"epoch"
    },
    {
        "word":"months",
        "options":"constructed",
        "measurement-eval":"2629743833.3 * `milliseconds`",
        "measurement-type":"epoch",
    },
    {
        "word":"weeks",
        "options":"constructed",
        "measurement-eval":"604800000 * `milliseconds`",
        "measurement-type":"epoch",
    },
    {
        "word":"days",
        "options":"constructed",
        "measurement-eval":"86400000 * `milliseconds`",
        "measurement-type":"epoch",
    },
    {
        "word":"hours",
        "options":"constructed",
        "measurement-eval":"3600000 * `milliseconds`",
        "measurement-type":"epoch",
    },
    {
        "word":"minutes",
        "options":"constructed",
        "measurement-eval":"60000 * `milliseconds`",
        "measurement-type":"epoch",
    },
    {
        "word":"seconds",
        "options":"constructed",
        "measurement-eval":"1000 * `milliseconds`",
        "measurement-type":"epoch",
    },
    {
        "word":"milliseconds",
        "options":"constructed",
        "measurement-eval":"1",
        "measurement-type":"epoch",
    }
];

var RelativeThesaurus = [
    {
        "word":"from",
        "measurement-eval":"`previous` + `next`"
    },
    {
        "word":"to",
        "measurement-eval":"`previous` / `next`"
    },
    {
        "word":"as",
        "measurement-eval":"`previous` / `next`"
    },
    {
        "word":"previous",
        "measurement-eval":"- 1"
    },
    {
        "word":"next",
        "measurement-eval":"+ 1"
    }
]

var AbsoluteThesaurus

var fuse;
var MissingMatches = [];
var evalAs = [];
function explain( sentence ){
    var options = {
        shouldSort: true,
        includeScore: true,
        threshold: 0.6,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: [
            "word"
        ]
    };
    fuse = new Fuse(RelationalThesaurus, options); // "list" is the item array
    var chunks = sentence.split(" ");
    MissingMatches=[];
    evalAs = [];
    for(var i=0;i<chunks.length;i++){
        console.log(chunks[i]);
        try{
            if(eval(chunks[i]).constructor === Number){
                evalAs.push(chunks[i] + " * ");
            }
        }
        catch(exception){
            evalAs.push("(" + MapMeaning( chunks[i] ) + ")");
        }
    }

    return MissingMatches.length == 0 ? evalAs.join(" ") : MissingMatches;
}

function FuzzyFindMapping( word , relationalmap = RelationalThesaurus ){
    let sr = fuse.search(word);
    if(sr.length>=1){
        return sr[0]["item"] 
    }
    else{
        return false;
    }
}

function MapMeaning( word , prevItem = null ){
    var item = FuzzyFindMapping(word);
    if(item==false){
        MissingMatches.push(word);
        return "";
    } 
    else{
        return RelationalEvaluationMap( item , prevItem );
    }
}

/* Recursive Function that traverses relational map */
function RelationalEvaluationMap( item , prevItem){
    if(item["measurement-eval"].indexOf("\`")!=-1){
        const regex = /\`([a-zA-Z0-9]+)\`/gmi;
        let m;
        var evalLevel = _.cloneDeep(item["measurement-eval"]);
        while ((m = regex.exec(item["measurement-eval"])) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            var replacement = "(" + MapMeaning( m[1] ) + ")";
            evalLevel = evalLevel.replace("\`"+m[1]+"\`",replacement);
        }
        return evalLevel;
    }

    else{
        return "(" + item["measurement-eval"] + ")";
    }
}