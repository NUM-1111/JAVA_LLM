
#!/bin/bash
# Spring Boot Application Startup Script
# Ensures Java 17 is used for running the application

export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH

echo "Using Java:"
java -version

echo ""
echo "Starting Spring Boot Application..."
mvn spring-boot:run

