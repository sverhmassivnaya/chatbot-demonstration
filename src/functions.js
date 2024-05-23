/**
 * @function makeTempContextInfo - Собираем информацию о запросе
 * @returns {void} заполняем $client.contextInfo
 */
function makeTempContextInfo() {
    
    var $request = $jsapi.context().request;
    var $client = $jsapi.context().client;
    var $parseTree = $jsapi.context().parseTree;
    var $temp = $jsapi.context().temp;
    
    if (!$client.contextInfo) {
        $client.contextInfo = [];
    }
    $temp.contextInfo = {};
    
    $temp.contextInfo['event'] = $request.query;
    $temp.contextInfo['refsList'] = [];

    var markup = $caila.markup($request.query);
    log(JSON.stringify(markup));

    var count = 0;
    markup.words.forEach(function(word) {
        if (word.annotations.pos === 'S') {
            count++;
            var ref;
            for (var key in $parseTree) {
                if ($parseTree[key] === word.word) {
                    ref = key.replace('_', '$');
                    break;
                }
            }
            if (!ref) {
                ref = 'ref_' + count.toString();
            }
            
            var analysis = $nlp.parseMorph(word.word);
            log(JSON.stringify(analysis))
            var gender;
            var number;
            var isNomn;
            for (var el in analysis.tags) {
                if (analysis.tags[el] === 'femn' || analysis.tags[el] === 'neut' || analysis.tags[el] === 'masc') {
                    gender = analysis.tags[el];
                }
                if (analysis.tags[el] === 'plur' || analysis.tags[el] === 'sing') {
                    number = analysis.tags[el];
                }
                if (analysis.tags[el] === 'nomn') {
                    isNomn = true;
                }
            }
            gender = gender || '';
            number = number || '';
            
            $temp.contextInfo.refsList.push(word.word);     
            $temp.contextInfo[ref] = { word: word.word, gender: gender, number: number, isNomn: isNomn };
        }
    });
    log(toPrettyString($temp.contextInfo));
    
    $client.contextInfo.push($temp.contextInfo);
    log(toPrettyString($client.contextInfo));
}




/**
 * @function searchForReference - Ищем референта
 * @returns {void} заполняем списки $temp.reference и $temp.hypoCount
 */
function searchForReference() {
    
    var $request = $jsapi.context().request;
    var $client = $jsapi.context().client;
    var $parseTree = $jsapi.context().parseTree;
    var $temp = $jsapi.context().temp;
    
    if (!$client.contextInfo || !$temp.contextInfo) {
        return;
    }
    
    $temp.reference = $temp.reference || [];

    var markup = $caila.markup($request.query);
    log(JSON.stringify(markup));

    markup.words.forEach(function(word) {
        if (word.annotations.pos === 'SPRO') {
            var analysis = $nlp.parseMorph(word.word);
            log(JSON.stringify(analysis))
            var gender;
            var number;
            for (var el in analysis.tags) {
                if (analysis.tags[el] === 'femn' || analysis.tags[el] === 'neut' || analysis.tags[el] === 'masc') {
                    gender = analysis.tags[el];
                }
                if (analysis.tags[el] === 'plur' || analysis.tags[el] === 'sing') {
                    number = analysis.tags[el];
                }
            }
            gender = gender || '';
            number = number || '';
            
            var reversedContext = $client.contextInfo.slice(-5).reverse();
            var hypothesis;
            var isSpareHypo = 0;
            var isPriorityHypo = 0;
            var isNormalHypo = 0;
            $temp.hypoCount = {
                normalHypo: isNormalHypo,
                priorityHypo: isPriorityHypo,
                spareHypo: isSpareHypo
            }
            for (var el in reversedContext) {
                var referents = [];
                for (var candidate in reversedContext[el]) {
                    if (reversedContext[el][candidate] != reversedContext[el]['event'] && reversedContext[el][candidate] != reversedContext[el]['refsList']) {
                        if (reversedContext[el][candidate]['gender'] === gender && reversedContext[el][candidate]['number'] === number) {
                            hypothesis = reversedContext[el][candidate]['word'];
                            isNormalHypo++;
                            if ((isNomn && reversedContext[el].length - 2 >= 1) || reversedContext[el].length - 2 == 1) {
                                isPriorityHypo++;
                            }
                        } else if (reversedContext[el][candidate]['gender'] === gender || reversedContext[el][candidate]['number'] === number) {
                            hypothesis = reversedContext[el][candidate]['word'];
                            isSpareHypo++;
                        }
                        if (hypothesis) {
                            referents.push({ referent: hypothesis, priority: isPriorityHypo ? 'isPriorityHypo' : isNormalHypo ? 'isNormalHypo' : 'isSpareHypo' });
                        }
                    }
                }
                if (hypothesis && (isNormalHypo || isPriorityHypo)) {
                    $temp.reference.push({ reference: word.word, referent: referents });
                    break;
                }
            }
            $temp.reference.push({ reference: word.word, referent: referents });
        }
    });
}
