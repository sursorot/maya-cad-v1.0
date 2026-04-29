import type { OpeningShape } from '../../types';

export const DOOR_VIEWBOX = {
    minX: -469.1719,
    minY: -885.2862,
    width: 924.1399,
    height: 940.2863,
};

export const DOOR_SVG_CONTENT = `
<defs><pattern patternUnits="userSpaceOnUse" height="1000" width="1000" viewBox="0,0,10,10" id="placeholder"><polygon points="0,0 0,5 5,5 5,0" fill="grey"/><polygon points="5,5 5,10 10,10 10,5" fill="grey"/></pattern></defs><path d="M -325.6846 -808.2476 C -325.4024 -796.0896 -329.7543 -784.8670 -336.5392 -780.2563 C -343.3241 -775.6456 -351.1661 -778.5817 -353.4845 -792.8130 L -374.7580 -792.8204 L -375.0321 -50.2720 L -415.0321 -50.2861 L -414.8185 -792.8343 L -436.0920 -792.8416 C -438.4203 -778.6120 -446.2643 -775.6813 -453.0460 -780.2967 C -459.8277 -784.9121 -464.1719 -796.1377 -463.8812 -808.2955 C -463.5906 -820.4533 -458.7241 -831.0779 -451.7431 -834.7953 C -444.7622 -838.5126 -436.8913 -836.0298 -434.9692 -821.4562 L -414.7784 -821.4542 L -414.7580 -880.2862 L -374.7579 -880.2726 L -374.7783 -821.4403 L -354.5874 -821.4284 C -352.6553 -836.0006 -344.7826 -838.4780 -337.8043 -834.7558 C -330.8260 -831.0335 -325.9668 -820.4056 -325.6846 -808.2476 Z" fill="none" stroke-width="10.0000" stroke="rgba(0,0,0,1.00)"/><path d="M -450.0674 49.7017 L -450.0321 -50.2984 L -415.0321 -50.2861 L -415.0462 -10.2861 L -400.0462 -10.2808 L -400.0673 49.7193 L -450.0674 49.7017 Z" fill="none" stroke-width="10.0000" stroke="rgba(0,0,0,1.00)"/><path d="M 449.9340 50.0001 L 449.9680 -50.0001 L 414.9680 -50.0120 L 414.9544 -10.0119 L 399.9544 -10.0170 L 399.9339 49.9830 L 449.9340 50.0001 Z" fill="none" stroke-width="10.0000" stroke="rgba(0,0,0,1.00)"/><path d="M -436.0920 -792.8416 C -431.8950 -801.8438 -431.4907 -812.1547 -434.9698 -821.4578" fill="none" stroke-width="2.0000" stroke="rgba(0,0,0,1.00)"/><path d="M -353.4860 -792.8147 C -358.0673 -801.8050 -358.0630 -812.4462 -353.4746 -821.4329" fill="none" stroke-width="2.0000" stroke="rgba(0,0,0,1.00)"/><path d="M -374.7580 -792.8204 L -374.7481 -821.4403" fill="none" stroke-width="2.0000" stroke="rgba(0,0,0,1.00)"/><path d="M -414.8185 -792.8343 L -414.8086 -821.4542" fill="none" stroke-width="2.0000" stroke="rgba(0,0,0,1.00)"/><path d="M 414.9544 -10.0119 C 426.6762 -230.4010 349.8336 -446.3348 201.5218 -609.7740 C 53.2100 -773.2131 -154.2693 -870.6015 -374.7579 -880.2728" fill="none" stroke-width="2.0000" stroke="rgba(188,188,188,1.00)"/>
`;

export const DOOR_FRAME_THICKNESS_SVG = 100;
export const DOOR_VISUAL_WIDTH_SVG = 910;

export const getDoorVisualMetrics = (shape: OpeningShape) => {
    // Uniform scaling based on visual width (excluding viewbox padding)
    const scale = shape.width / DOOR_VISUAL_WIDTH_SVG;

    return {
        doorVisualWidth: shape.width,
        doorVisualHeight: shape.width * (DOOR_VIEWBOX.height / DOOR_VISUAL_WIDTH_SVG),
        scale,
    };
};
