export const sample1 = `%
O9901 (PALLET RUNNER)

(PRELOAD OFFSETS)
G10G90L2P1X1.2Y3.4Z5.6B7.8

N10T47M6
N20S5000M3
N30G0G90G54.1X1.2Y2.3
N40M22
N50B32.5
N60M21
N70G43H#518Z1.
N80M5
N90G91G28Z0.
N100M30
%`;

export const sample2 = `%
O7999 (MATERIAL VERIFICATION V5)

G10 G90 L2 P1 X1.2 Y3.4 Z5.6 B7.8

N1
T47M6
S5000M3
G0G90G54.1X1.2Y2.3

#26=-.2 ( PROBE DEPTH )
#9=100. ( PROTECTED POSITIONING FEEDRATE )

G65 P9811 Z#18
IF[#142 GT #3] GOTO914

G65 P9810 X[#24 + #21] F#9 M1.
%`;