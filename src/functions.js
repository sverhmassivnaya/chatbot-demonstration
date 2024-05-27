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
    //var markup = {"source":"кот любит ее","correctedText":"кот любит ее","words":[{"annotations":{"lemma":"кот","pos":"S"},"startPos":0,"endPos":3,"pattern":false,"punctuation":false,"source":"кот","word":"кот"},{"annotations":{"lemma":"любить","pos":"V"},"startPos":4,"endPos":9,"pattern":false,"punctuation":false,"source":"любит","word":"любит"},{"annotations":{"lemma":"она","pos":"SPRO"},"startPos":10,"endPos":12,"pattern":false,"punctuation":false,"source":"ее","word":"ее"}]};
    log(JSON.stringify(markup));
    log(JSON.stringify($parseTree));

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
            var casename;
            for (var el in analysis.tags) {
                if (analysis.tags[el] === 'femn' || analysis.tags[el] === 'neut' || analysis.tags[el] === 'masc') {
                    gender = analysis.tags[el];
                }
                if (analysis.tags[el] === 'plur' || analysis.tags[el] === 'sing') {
                    number = analysis.tags[el];
                }
                if (analysis.tags[el] === 'nomn' || analysis.tags[el] === 'gent' || analysis.tags[el] === 'datv' || analysis.tags[el] === 'accs' || analysis.tags[el] === 'ablt' || analysis.tags[el] === 'loct') {
                    casename = analysis.tags[el];
                }
                if (analysis.tags[el] === 'nomn') {
                    isNomn = true;
                }
            }
            gender = gender || '';
            number = number || '';
            casename = casename || '';
            
            $temp.contextInfo.refsList.push(word.word);     
            $temp.contextInfo[ref] = { word: word.word, gender: gender, number: number, casename: casename, isNomn: isNomn };
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
    //var markup = {"source":"кот любит ее","correctedText":"кот любит ее","words":[{"annotations":{"lemma":"кот","pos":"S"},"startPos":0,"endPos":3,"pattern":false,"punctuation":false,"source":"кот","word":"кот"},{"annotations":{"lemma":"любить","pos":"V"},"startPos":4,"endPos":9,"pattern":false,"punctuation":false,"source":"любит","word":"любит"},{"annotations":{"lemma":"она","pos":"SPRO"},"startPos":10,"endPos":12,"pattern":false,"punctuation":false,"source":"ее","word":"ее"}]};
    log(JSON.stringify(markup));

    markup.words.forEach(function(word) {
        if (word.annotations.pos === 'SPRO') {
            var analysis = $nlp.parseMorph(word.word);
            log(JSON.stringify(analysis));
            var gender;
            var number;
            var casename;
            for (var el in analysis.tags) {
                if (analysis.tags[el] === 'femn' || analysis.tags[el] === 'neut' || analysis.tags[el] === 'masc') {
                    gender = analysis.tags[el];
                }
                if (analysis.tags[el] === 'plur' || analysis.tags[el] === 'sing') {
                    number = analysis.tags[el];
                }
                if (analysis.tags[el] === 'nomn' || analysis.tags[el] === 'gent' || analysis.tags[el] === 'datv' || analysis.tags[el] === 'accs' || analysis.tags[el] === 'ablt' || analysis.tags[el] === 'loct') {
                    casename = analysis.tags[el];
                }
            }
            gender = gender || '';
            number = number || '';
            casename = analysis.tags[el];
            
            var reversedContext = $client.contextInfo.slice(-5).reverse();
            log(JSON.stringify(reversedContext));
            for (var el in reversedContext) {
                var hypothesis;
                var SpareHypo = 0;
                var PriorityHypo = 0;
                var NormalHypo = 0;
                var referents = [];
                for (var candidate in reversedContext[el]) {
                    if (reversedContext[el][candidate] != reversedContext[el]['event'] && reversedContext[el][candidate] != reversedContext[el]['refsList']) {
                        var isSpareHypo;
                        var isPriorityHypo;
                        var isNormalHypo;
                        if (reversedContext[el][candidate]['gender'] === gender && reversedContext[el][candidate]['number'] === number) {
                            hypothesis = reversedContext[el][candidate]['word'];
                            if ((reversedContext[el][candidate]['isNomn'] && reversedContext[el].length - 2 > 1) || reversedContext[el].length - 2 == 1) {
                                isPriorityHypo++;
                                isPriorityHypo = true;
                            } else {
                                NormalHypo = NormalHypo + 1;
                                isNormalHypo = true;
                            }
                        } else if (reversedContext[el][candidate]['gender'] === gender || reversedContext[el][candidate]['number'] === number) {
                            hypothesis = reversedContext[el][candidate]['word'];
                            SpareHypo++;
                            isSpareHypo = true;
                        }
                        if (hypothesis) {
                            referents.push({ referent: hypothesis, priority: isPriorityHypo ? 'isPriorityHypo' : isNormalHypo ? 'isNormalHypo' : 'isSpareHypo' });
                        }
                        if (hypothesis && (isNormalHypo || isPriorityHypo)) {
                            $temp.reference.push({ reference: word.word, normalHypo: NormalHypo, priorityHypo: PriorityHypo, spareHypo: SpareHypo, referent: referents });
                        }
                    }
                }
            }
        }
    });
    log(toPrettyString($temp.reference));
}
