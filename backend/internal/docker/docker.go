// Package docker communicates with the Docker Engine API via the Unix socket.
// No SDK — raw HTTP over net.Dial("unix", ...).
package docker

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"time"
)

const socketPath = "/var/run/docker.sock"

type ContainerStatus struct {
	Name        string
	ContainerID string
	Status      string
	Image       string
	StartedAt   string
	Health      string
	Available   bool
	Error       string
}

func newClient() *http.Client {
	return &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
				return (&net.Dialer{}).DialContext(ctx, "unix", socketPath)
			},
		},
	}
}

func get(path string, out interface{}) error {
	client := newClient()
	resp, err := client.Get("http://localhost" + path)
	if err != nil {
		return fmt.Errorf("docker unavailable: %w", err)
	}
	defer resp.Body.Close()
	return json.NewDecoder(resp.Body).Decode(out)
}

func post(path string) error {
	client := newClient()
	resp, err := client.Post("http://localhost"+path, "application/json", nil)
	if err != nil {
		return fmt.Errorf("docker unavailable: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("docker error %d: %s", resp.StatusCode, string(b))
	}
	return nil
}

func GetStatus(name string) ContainerStatus {
	var result []map[string]interface{}
	if err := get(fmt.Sprintf("/containers/json?all=1&filters={\"name\":[\"%s\"]}", name), &result); err != nil {
		return ContainerStatus{Name: name, Status: "unavailable", Error: err.Error()}
	}

	// Filter exact name match
	for _, c := range result {
		names, _ := c["Names"].([]interface{})
		for _, n := range names {
			if s, _ := n.(string); strings.TrimPrefix(s, "/") == name {
				id, _ := c["Id"].(string)
				if len(id) > 12 {
					id = id[:12]
				}
				state, _ := c["State"].(string)
				image, _ := c["Image"].(string)
				status, _ := c["Status"].(string)
				_ = status

				// Fetch detailed inspect for started_at and health
				var inspect map[string]interface{}
				_ = get("/containers/"+id+"/json", &inspect)
				startedAt := ""
				health := ""
				if stateMap, ok := inspect["State"].(map[string]interface{}); ok {
					startedAt, _ = stateMap["StartedAt"].(string)
					if h, ok := stateMap["Health"].(map[string]interface{}); ok {
						health, _ = h["Status"].(string)
					}
				}

				return ContainerStatus{
					Name: name, ContainerID: id, Status: state,
					Image: image, StartedAt: startedAt, Health: health, Available: true,
				}
			}
		}
	}
	return ContainerStatus{Name: name, Status: "not_found", Available: true}
}

func Restart(name string) error {
	return post(fmt.Sprintf("/containers/%s/restart?t=30", name))
}

func Logs(name string, tail int) (string, error) {
	client := newClient()
	url := fmt.Sprintf("http://localhost/containers/%s/logs?stdout=1&stderr=1&tail=%d&timestamps=1", name, tail)
	resp, err := client.Get(url)
	if err != nil {
		return "", fmt.Errorf("docker unavailable: %w", err)
	}
	defer resp.Body.Close()
	// Docker logs stream uses a multiplexed format; strip 8-byte header per frame.
	var sb strings.Builder
	buf := make([]byte, 8)
	for {
		_, err := io.ReadFull(resp.Body, buf)
		if err != nil {
			break
		}
		size := int(buf[4])<<24 | int(buf[5])<<16 | int(buf[6])<<8 | int(buf[7])
		line := make([]byte, size)
		if _, err := io.ReadFull(resp.Body, line); err != nil {
			break
		}
		sb.Write(line)
	}
	return sb.String(), nil
}
