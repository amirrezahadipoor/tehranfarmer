// ابزار مشترک تست‌ها: دسترسی به state، ریست، و پیشبرد قطعی زمان
export {
  S, UI, saveGame, loadGame, hasSave, resetGame, notify, advance, newDay, season, year,
  farmLevel, xpProgress, addXp, addStat, doAct, canAct, sellGood, sellAll, buySeed, buyFeed,
  goodPrice, seedPrice, invCount, invCap, packCount, packCap, transferPackToBarn, stamCap, troughCap, penCap, penHas, toast, addGood, pay,
  stockPond, feedPond, harvestPond, harvestHoney, honeyCap,
  sleepToMorning, enqueueBuild, completeBuild, tickBuilds, feedPond as feedPondFn, buyUpgrade, buyPen, buyAnimal, buyGh, buySilo, buyPond, buyHive,
} from '../../src/game/state';
import { COLS, ROWS } from '../../src/game/data';
export const COLSxROWS = () => COLS * ROWS;
