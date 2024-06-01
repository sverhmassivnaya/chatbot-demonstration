require: slotfilling/slotFilling.sc
  module = sys.zb-common
require: ./patterns.sc
require: ./functions.js
theme: /

    state: Start
        q!: $regex</start>
        a: Здравствуйте! Я учусь понимать референцию. Приведите мне пример, а я покажу, что умею.
         
         
    state: TellAbout
        # расскажи о полотне, прачке, матросе, солнце, баклажане, коте, кошке
        q!: * { {($tellVImpSyns/$tellVFut2Syns) * ($what/$something)} * {($canVPres2/$beAbleVPres2/$canVPresSg3/$beAbleVPresSg3) * ($canvas/$laundress/$seaman/$sun/$aubergine/$catM/$catF)} } *
        q!: * { {($tellVImpSyns/$tellVFut2Syns) * ($canVPres2/$beAbleVPres2/$canVPresSg3/$beAbleVPresSg3)} * {($what/$something) * ($canvas/$laundress/$seaman/$sun/$aubergine/$catM/$catF)} } *
        q!: * { {($tellVImpSyns/$tellVFut2Syns) * ($canvas/$laundress/$seaman/$sun/$aubergine/$catM/$catF)} * {($what/$something) * ($canVPres2/$beAbleVPres2/$canVPresSg3/$beAbleVPresSg3)} } *
        q!: * $what $thinkVPres2 (о/про/насчет) * ($canvas/$laundress/$seaman/$sun/$aubergine/$catM/$catF) *
        q!: * ($tellVImpSyns/$tellVFut2Syns) (о/про/насчет) * ($canvas/$laundress/$seaman/$sun/$aubergine/$catM/$catF) *
        q!: * ($canVPres2/$beAbleVPres2/$knowPres2/$canVPresSg3/$beAbleVPresSg3/$knowPresSg3) (о/про/насчет) * ($canvas/$laundress/$seaman/$sun/$aubergine/$catM/$catF) *
        script:
            makeTempContextInfo();
        go!: /Answer
        
        
    state: NoMatch
        event!: noMatch
        script:
            makeTempContextInfo();
        go!: /Answer
        
        
    state: Answer
        script:
            searchForReference();  
            
            // сортируем и объединяем полученные референции
            var sortedReferences = {};
            log('$temp.reference = ' + JSON.stringify($temp.reference));
            
            $temp.reference.forEach(function(referenceWord) {
              log('referenceWord = ' + JSON.stringify(referenceWord));
              var normalizedReference = $nlp.inflect(referenceWord.reference, 'nomn');
              log('normalizedReference = ' + JSON.stringify(normalizedReference));
              // записываем в includedReference нормализованный референс
              var includedReference = '';
              for (ref in sortedReferences) {
                log('ref = ' + ref);
                log('referenceWord.reference = ' + JSON.stringify(referenceWord.reference));
                if (ref === referenceWord.reference) {
                    includedReference = ref;
                    break;
                }
              }
            
              if (!includedReference) {
                var objDraft = {
                  "reference": referenceWord.reference,
                  "priorityHypo": 0,
                  "normalHypo": 0,
                  "spareHypo": 0,
                  priority: [],
                  normal: [],
                  spare: [],
                }
              }
              
              referenceWord.referent.forEach(function(referent) {
                log('referent = ' + JSON.stringify(referent));
                if (referent['priority'] === 'isPriorityHypo') {
                  if (includedReference) {
                      if (sortedReferences[includedReference].priority.indexOf(referent['referent']) === -1) {
                        sortedReferences[includedReference].priorityHypo += 1; 
                        sortedReferences[includedReference].priority.push(referent.referent);
                      }
                  } else {
                      if (objDraft.priority.indexOf(referent['referent']) === -1) {
                        objDraft.priorityHypo += 1;
                        objDraft.priority.push(referent.referent);
                      }
                  }
                } else if (referent['priority'] === 'isNormalHypo') {
                    if (includedReference) {
                      if (sortedReferences[includedReference].normal.indexOf(referent['referent']) === -1) {
                        sortedReferences[includedReference].normalHypo += 1; 
                        sortedReferences[includedReference].normal.push(referent.referent);
                      }
                  } else {
                      if (objDraft.normal.indexOf(referent['referent']) === -1) {
                        objDraft.normalHypo += 1;
                        objDraft.normal.push(referent.referent);
                      }
                  }
                } else if (referent['priority'] === 'isSpareHypo') {
                  if (includedReference) {
                      if (sortedReferences[includedReference].spare.indexOf(referent['referent']) === -1) {
                        sortedReferences[includedReference].spareHypo += 1; 
                        sortedReferences[includedReference].spare.push(referent.referent);
                      }
                  } else {
                      if (objDraft.spare.indexOf(referent['referent']) === -1) {
                        objDraft.spareHypo += 1;
                        objDraft.spare.push(referent.referent);
                      }
                  }
                }
              });
            
              if (!includedReference) {
                sortedReferences[normalizedReference] = objDraft;
              }
              log('sortedReferences = ' + JSON.stringify(sortedReferences));
            });
            
            var ans = '';
            var search = '';
            var refsKey = '';
            for (var ref in sortedReferences) {
                if (sortedReferences[ref].priorityHypo > 0) {
                    search = 'isPriorityHypo';
                    refsKey = 'priority';
                } else if (sortedReferences[ref].normalHypo > 0) {
                    search = 'isNormalHypo';
                    refsKey = 'normal';
                } else {
                    search = 'isSpareHypo';
                    refsKey = 'spare';
                }
                var referentText = '';
                sortedReferences[ref][refsKey].forEach(function (word) {
                    referentText = !referentText ? $nlp.inflect(word, 'nomn') : referentText + ', ' + $nlp.inflect(word, 'nomn');
                });
                ans += '\nРеференциальное выражение -- ' + sortedReferences[ref].reference +
                    '. Референт -- ' + referentText +
                    (search === 'isSpareHypo' ? ', но я в этом не уверен.' : '.');
            };
                    
            var preamble = $temp.reference.length === 0
                ? 'Я не нашел референциальных выражений в ваших словах. Скажите еще что-нибудь.'
                : $temp.reference.length === 1
                ? 'В вашем сообщении встретилась референция. '
                : 'Я нашел сразу несколько случаев референции. ';
            ans = preamble + ans;
            $reactions.answer(ans);
            
            # //ььььь
            # var ans = '';
            # for (var el in $temp.reference) {
            #     // расставляем приоритеты
            #     var search = '';
            #     var referent = '';
            #     if ($temp.reference[el].priorityHypo > 0) {
            #         search = 'isPriorityHypo';
            #     } else if ($temp.reference[el].normalHypo > 0) {
            #         search = 'isNormalHypo';
            #     } else {
            #         search = 'isSpareHypo';
            #     }
            #     log('search = ' + search)
                
            #     referent = $temp.reference[el].referent.filter(function(ref) {
            #         if (ref.priority == search) {
            #             return ref.referent;
            #         }
            #     });
            #     log('referent = '+ toPrettyString(referent));
                    
            #     var referentText = '';
            #     referent.forEach(function (word) {
            #         referentText = !referentText ? $nlp.inflect(word.referent, 'nomn') : referentText += ', ' + $nlp.inflect(word.referent, 'nomn');
            #     });
            #     ans += '\nРеференциальное выражение -- ' + $temp.reference[el].reference +
            #         '. Референт -- ' + referentText +
            #         (search === 'isSpareHypo' ? ', но я в этом не уверен.' : '.');
            # }
        
        
                        
    state: ClearClient
        q!: * (удали*/удаля*/удаление) *
        script:
            delete $client.contextInfo;
        a: Ой! Я все забыл.