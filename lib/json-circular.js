var JsonCircular = {};

JsonCircular.magicMarkerName = "@internal-ref";
JsonCircular.deserializationError = {"@internal-error": "Invalid Deserialization Reference"};

JsonCircular.stringify = function(obj, replacer){
	var returnStr = JSON.stringify(JsonCircular.preprocess(obj), replacer);
	JsonCircular.postprocess(obj);
	return returnStr;
};

JsonCircular.parse = function(str, reviver){
	return JsonCircular.postprocess(JSON.parse(str, reviver));
};

JsonCircular.preprocess = function(obj){
	var visited = [obj];
	var paths = [""];
	var path = "";
	var process = function(lobj, lpath){
		if (lobj !== null) {
			for(var k in lobj){
				var localpath = lpath;
				if(localpath !== "")
					localpath += ".";
				localpath += k;
				if(typeof(lobj[k]) === "object"){
					if(visited.indexOf(lobj[k]) >= 0){
						var targetPath = paths[visited.indexOf(lobj[k])];
						lobj[k] = {};
						lobj[k][JsonCircular.magicMarkerName] = targetPath;
					}else{
						visited.push(lobj[k]);
						paths.push(localpath);
						process(lobj[k], localpath);
					}
				}
			}
		}
	};
	process(obj, path);
	return obj;
};

JsonCircular.postprocess = function(obj){
	var fetchTargetRef = function(lobj, targetPath){
		if(targetPath.indexOf('.') >= 0){
			var pathFragment = targetPath.substr(0, targetPath.indexOf('.'));
			if(pathFragment in lobj){
				var newPath = targetPath.substr(targetPath.indexOf('.')+1);
				return fetchTargetRef(lobj[pathFragment], newPath);
			}else{
				return JsonCircular.deserializationError;
			}
		}else{
			if(targetPath === ""){
				return lobj;
			}else if(targetPath in lobj){
				return lobj[targetPath];
			}else{
				return JsonCircular.deserializationError;
			}
		}
	};
	var process = function(lobj){
		if (lobj !== null) {
			for(var k in lobj){
				if(lobj[k] !== null && typeof(lobj[k]) === "object"){
					if(JsonCircular.magicMarkerName in lobj[k]){
						var targetPath = lobj[k][JsonCircular.magicMarkerName];
						lobj[k] = fetchTargetRef(obj, targetPath);
					}else{
						process(lobj[k]);
					}
				}
			}
		}
	};
	process(obj);
	return obj;
};
