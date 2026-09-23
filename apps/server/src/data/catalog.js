// Synthetic assessment fixtures. No claim of current OEM specifications or prices.
export const vehicles=[
 {model:'Thar',positioning:'Adventure-oriented SUV',features:['Demo 4WD configuration','Demo removable roof configuration'],exampleVariant:'Demo Adventure',indicativePriceINR:1500000},
 {model:'XUV700',positioning:'Family-oriented SUV',features:['Demo seven-seat configuration','Demo driver assistance package'],exampleVariant:'Demo Family',indicativePriceINR:2200000},
 {model:'Scorpio-N',positioning:'SUV for family and touring use',features:['Demo seven-seat configuration','Demo diesel configuration'],exampleVariant:'Demo Z8L',indicativePriceINR:2400000}
];
export function catalog(model='all') {return {disclaimer:'Synthetic assessment catalog, not an official specification or current price list. Variant availability, taxes, insurance, and on-road pricing require dealer confirmation.',vehicles:model==='all'?vehicles:vehicles.filter(v=>v.model.toLowerCase()===model.toLowerCase())};}
