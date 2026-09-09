// V10: relief operations no longer make you wait between them.
// The cooldown remains in the save format and is still set momentarily, because the V4 layer uses
// it to detect that an operation actually went through and to grant crisis protection. It is
// cleared immediately afterwards, so it never gates anything.
const v9DebtReliefV10=debtRelief;
debtRelief=function(kind){
 v9DebtReliefV10(kind);
 for(const n of S.nations)n.reliefCooldown=0;
 if(view==='policies')renderPanel();
};
const v9NewGameV10=newGame;
newGame=function(){v9NewGameV10();S.version=10;for(const n of S.nations)n.reliefCooldown=0;};
const v9MigrateV10=migrateSave;
migrateSave=function(s){
 s=v9MigrateV10(s);if(s?.version!==9)return s;
 // A world saved under the old rule may be mid-wait; release it.
 for(const n of s.nations)n.reliefCooldown=0;
 s.version=10;return s;};
const v9ValidSaveV10=validSave;
validSave=function(s){
 v9ValidSaveV10(s);
 if(s.nations.some(n=>n.reliefCooldown!==0))throw Error('Relief cooldowns are no longer used.');
 return s;};
