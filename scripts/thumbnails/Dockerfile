from ubuntu:18.10

# Install Python
RUN apt-get update -y && \
    apt-get install -y \
      python \
      python-dev \
      python-pip

# Install youtube-dl
RUN pip install youtube_dl

# Install ffmpeg
RUN apt-get install -y ffmpeg

# Install AWS cli
RUN pip install awscli

# Put executable script at root
COPY run /root/
RUN chmod +x /root/run
ENTRYPOINT ["/root/run"]
