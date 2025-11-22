FROM mcr.microsoft.com/dotnet/sdk:10.0

ENV NUGET_PACKAGES=/nuget/packages
ENV DOTNET_CLI_TELEMETRY_OPTOUT=1
ENV DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1
ENV DOTNET_NOLOGO=1

RUN mkdir -p /nuget/packages && \
    chmod -R 777 /nuget/packages

RUN echo '#!/bin/bash' > /usr/local/bin/fastcsc && \
    echo '/usr/share/dotnet/sdk/10.0.100/Roslyn/bincore/csc $(ls /usr/share/dotnet/packs/Microsoft.NETCore.App.Ref/10.0.0/ref/net10.0/*.dll | sed '"'"'s/^/-r:/'"'"') "$@"' >> /usr/local/bin/fastcsc && \
    echo 'OUTPUT="${1%.cs}.exe"' >> /usr/local/bin/fastcsc && \
    echo 'RUNTIMECONFIG="${OUTPUT%.exe}.runtimeconfig.json"' >> /usr/local/bin/fastcsc && \
    echo 'cat > "$RUNTIMECONFIG" << '"'"'RTCONFIG'"'"'' >> /usr/local/bin/fastcsc && \
    echo '{' >> /usr/local/bin/fastcsc && \
    echo '  "runtimeOptions": {' >> /usr/local/bin/fastcsc && \
    echo '    "tfm": "net10.0",' >> /usr/local/bin/fastcsc && \
    echo '    "framework": {' >> /usr/local/bin/fastcsc && \
    echo '      "name": "Microsoft.NETCore.App",' >> /usr/local/bin/fastcsc && \
    echo '      "version": "10.0.0"' >> /usr/local/bin/fastcsc && \
    echo '    }' >> /usr/local/bin/fastcsc && \
    echo '  }' >> /usr/local/bin/fastcsc && \
    echo '}' >> /usr/local/bin/fastcsc && \
    echo 'RTCONFIG' >> /usr/local/bin/fastcsc && \
    chmod +x /usr/local/bin/fastcsc

RUN useradd -m runner && chmod 1777 /tmp
USER runner
WORKDIR /tmp
