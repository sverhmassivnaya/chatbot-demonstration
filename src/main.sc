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
            var ans = '';
            for (var el in $temp.reference) {
                // расставляем приоритеты
                var search = '';
                var referent = '';
                if ($temp.reference[el].priorityHypo > 0) {
                    search = 'isPriorityHypo';
                } else if ($temp.reference[el].normalHypo > 0) {
                    search = 'isNormalHypo';
                } else {
                    search = 'isSpareHypo';
                }
                log('search = ' + search)
                
                referent = $temp.reference[el].referent.filter(function(ref) {
                    if (ref.priority == search) {
                        return ref.referent;
                    }
                });
                log('referent = '+ referent);
                    
                var referentText = '';
                referent.forEach(function (word) {
                    referentText = !referentText ? $nlp.inflect(word.referent, 'nomn') : referentText += ', ' + $nlp.inflect(word.referent, 'nomn');
                });
                ans += '\nРеференциальное выражение -- ' + $temp.reference[el].reference +
                    '. Референт -- ' + referentText +
                    (search === 'isSpareHypo' ? ', но я в этом не уверен.' : '.');
                    
            }
            var preamble = $temp.reference.length === 0
                ? 'Я не нашел референциальных выражений в ваших словах. Скажите еще что-нибудь'
                : $temp.reference.length === 1
                ? 'В вашем сообщении встретилась референция. '
                : 'Я нашел сразу несколько случаев референции. ';
            ans = preamble + ans;
            $reactions.answer(ans);
        
               
           
                        
    state: ClearClient
        q!: * (удали*/удаля*/удаление) *
        script:
            delete $client.contextInfo;
        a: Ой! Я все забыл.
            