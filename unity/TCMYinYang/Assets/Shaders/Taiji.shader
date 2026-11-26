Shader "TCM/Taiji"
{
    Properties
    {
        _YinColor ("Yin color", Color) = (0.10, 0.45, 1.0, 1)
        _YangColor ("Yang color", Color) = (1.0, 0.42, 0.10, 1)
        _GlowColor ("Glow color", Color) = (0.85, 0.97, 1.0, 1)
        _Intensity ("Intensity", Range(0, 3)) = 1
        _FlowSpeed ("Flow speed", Float) = 0.6
        _EdgeGlow ("Edge glow", Range(0, 2)) = 0.9
        _SGlow ("S glow", Range(0, 2)) = 0.7
    }
    SubShader
    {
        Tags { "Queue"="Transparent" "RenderType"="Transparent" "IgnoreProjector"="True" }
        Blend SrcAlpha OneMinusSrcAlpha
        ZWrite Off
        Cull Off

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
                float2 uv : TEXCOORD0;
            };

            struct v2f
            {
                float4 pos : SV_POSITION;
                float2 uv : TEXCOORD0;
            };

            fixed4 _YinColor;
            fixed4 _YangColor;
            fixed4 _GlowColor;
            float _Intensity;
            float _FlowSpeed;
            float _EdgeGlow;
            float _SGlow;

            v2f vert (appdata v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.uv = v.uv;
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                float2 p = i.uv * 2.0 - 1.0;
                float r = length(p);
                float aa = fwidth(r) * 1.5 + 0.0015;
                float disc = 1.0 - smoothstep(1.0 - aa, 1.0, r);
                if (disc <= 0.001) discard;

                // Classic S-curve: top lobe bulges right, bottom lobe bulges left.
                float topCircle = length(p - float2(0.0, 0.5));
                float bottomCircle = length(p - float2(0.0, -0.5));
                bool yinRegion = (p.x < 0.0 && bottomCircle > 0.5) || (topCircle < 0.5);

                float whiteDot = 1.0 - smoothstep(0.115, 0.145, length(p - float2(0.0, 0.5)));
                float darkDot = 1.0 - smoothstep(0.115, 0.145, length(p - float2(0.0, -0.5)));

                float3 yin = _YinColor.rgb;
                float3 yang = _YangColor.rgb;
                float3 col = yinRegion ? yin : yang;
                col = lerp(col, yang, whiteDot);
                col = lerp(col, yin, darkDot);

                float angle = atan2(p.y, p.x);
                float shimmer = 0.5 + 0.5 * sin(angle * 4.0 - _Time.y * _FlowSpeed * 2.0 + r * 6.0);
                col *= 0.86 + 0.14 * shimmer;

                float edge = smoothstep(0.93, 1.0, r);
                col += _GlowColor.rgb * edge * _EdgeGlow;

                float sTopDist = abs(topCircle - 0.5) + step(p.x, -0.0001) * 2.0;
                float sBottomDist = abs(bottomCircle - 0.5) + step(0.0001, p.x) * 2.0;
                float sDist = min(sTopDist, sBottomDist);
                float sGlow = smoothstep(0.020, 0.0, sDist) * _SGlow;
                col += _GlowColor.rgb * sGlow * (0.55 + 0.45 * sin(_Time.y * 2.0));

                float alpha = disc * (0.84 + edge * 0.16);
                col *= _Intensity;
                return fixed4(col, alpha);
            }
            ENDCG
        }
    }
    FallBack Off
}
