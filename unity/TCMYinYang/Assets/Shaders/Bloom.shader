Shader "Hidden/TCM/Bloom"
{
    Properties
    {
        _MainTex ("Source", 2D) = "white" {}
        _BloomTex ("Bloom", 2D) = "black" {}
        _Threshold ("Threshold", Float) = 1.0
        _SoftKnee ("Soft knee", Float) = 0.5
        _Intensity ("Intensity", Float) = 0.75
        _BlurSize ("Blur size", Float) = 1.0
        _Tint ("Tint", Color) = (1, 1, 1, 1)
    }

    CGINCLUDE
    #include "UnityCG.cginc"

    sampler2D _MainTex;
    float4 _MainTex_TexelSize;
    sampler2D _BloomTex;
    float _Threshold;
    float _SoftKnee;
    float _Intensity;
    float _BlurSize;
    float4 _Tint;

    struct v2f
    {
        float4 pos : SV_POSITION;
        float2 uv : TEXCOORD0;
    };

    v2f vert (appdata_img v)
    {
        v2f o;
        o.pos = UnityObjectToClipPos(v.vertex);
        o.uv = v.texcoord;
        return o;
    }

    float4 fragPrefilter (v2f i) : SV_Target
    {
        float4 c = tex2D(_MainTex, i.uv);
        float brightness = max(c.r, max(c.g, c.b));
        float knee = _Threshold * _SoftKnee + 0.0001;
        float soft = smoothstep(_Threshold - knee, _Threshold + knee, brightness);
        return fixed4(c.rgb * soft, 1.0);
    }

    float4 fragBlurH (v2f i) : SV_Target
    {
        float2 offset = float2(_MainTex_TexelSize.x * _BlurSize, 0.0);
        float4 c = tex2D(_MainTex, i.uv) * 0.2270270270;
        c += tex2D(_MainTex, i.uv + offset * 1.3846153846) * 0.3162162162;
        c += tex2D(_MainTex, i.uv - offset * 1.3846153846) * 0.3162162162;
        c += tex2D(_MainTex, i.uv + offset * 3.2307692308) * 0.0702702703;
        c += tex2D(_MainTex, i.uv - offset * 3.2307692308) * 0.0702702703;
        return c;
    }

    float4 fragBlurV (v2f i) : SV_Target
    {
        float2 offset = float2(0.0, _MainTex_TexelSize.y * _BlurSize);
        float4 c = tex2D(_MainTex, i.uv) * 0.2270270270;
        c += tex2D(_MainTex, i.uv + offset * 1.3846153846) * 0.3162162162;
        c += tex2D(_MainTex, i.uv - offset * 1.3846153846) * 0.3162162162;
        c += tex2D(_MainTex, i.uv + offset * 3.2307692308) * 0.0702702703;
        c += tex2D(_MainTex, i.uv - offset * 3.2307692308) * 0.0702702703;
        return c;
    }

    float4 fragComposite (v2f i) : SV_Target
    {
        float4 src = tex2D(_MainTex, i.uv);
        float4 bloom = tex2D(_BloomTex, i.uv) * _Tint;
        return fixed4(src.rgb + bloom.rgb * _Intensity, src.a);
    }
    ENDCG

    SubShader
    {
        Cull Off
        ZWrite Off
        ZTest Always

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment fragPrefilter
            ENDCG
        }

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment fragBlurH
            ENDCG
        }

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment fragBlurV
            ENDCG
        }

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment fragComposite
            ENDCG
        }
    }
    FallBack Off
}
